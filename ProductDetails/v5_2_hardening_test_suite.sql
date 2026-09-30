-- ========================================================================
-- FOODY VRINDA v5.2 — PRODUCTION HARDENING TEST SUITE (v3 — Table Output)
-- Results visible directly in Supabase SQL Editor Results tab
-- ========================================================================

-- Create temp results table
DROP TABLE IF EXISTS _test_results;
CREATE TEMP TABLE _test_results (
  test_id TEXT,
  test_name TEXT,
  result TEXT,
  detail TEXT
);

-- Ensure extensions & triggers exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.foody_order_events ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.foody_order_events ADD COLUMN IF NOT EXISTS previous_event_hash TEXT;
ALTER TABLE public.foody_order_events ADD COLUMN IF NOT EXISTS event_hash TEXT DEFAULT 'pending';

-- Recreate triggers (idempotent)
CREATE OR REPLACE FUNCTION public.compute_event_hash_chain()
RETURNS TRIGGER AS $$
DECLARE prev_hash TEXT; payload TEXT;
BEGIN
    PERFORM 1 FROM public.foody_orders WHERE id = NEW.order_id FOR UPDATE;
    SELECT event_hash INTO prev_hash FROM public.foody_order_events
    WHERE order_id = NEW.order_id AND ctid != NEW.ctid ORDER BY created_at DESC LIMIT 1;
    IF prev_hash IS NULL THEN prev_hash := 'GENESIS_' || NEW.order_id; END IF;
    NEW.previous_event_hash := prev_hash;
    payload := NEW.order_id || '|' || NEW.actor_id || '|' || NEW.actor_role || '|' || NEW.event_type || '|' || COALESCE(NEW.metadata::text, '{}') || '|' || NEW.created_at::text || '|' || prev_hash;
    NEW.event_hash := encode(digest(payload, 'sha256'), 'hex');
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_compute_event_hash ON public.foody_order_events;
CREATE TRIGGER trg_compute_event_hash BEFORE INSERT ON public.foody_order_events FOR EACH ROW EXECUTE FUNCTION public.compute_event_hash_chain();

CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$ BEGIN RAISE EXCEPTION 'Security Policy Violation: foody_order_events records are strictly immutable and cannot be updated or deleted.'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_audit_tamper ON public.foody_order_events;
CREATE TRIGGER trg_prevent_audit_tamper BEFORE UPDATE OR DELETE ON public.foody_order_events FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE allowed TEXT[];
BEGIN
    CASE OLD.status
        WHEN 'new' THEN allowed := ARRAY['confirmed','accepted','preparing','payment_pending','cancelled'];
        WHEN 'payment_pending' THEN allowed := ARRAY['confirmed','cancelled'];
        WHEN 'confirmed' THEN allowed := ARRAY['accepted','preparing','cooking','cancelled'];
        WHEN 'accepted' THEN allowed := ARRAY['preparing','cooking','cancelled'];
        WHEN 'preparing' THEN allowed := ARRAY['cooking','ready_for_pickup','cancelled'];
        WHEN 'cooking' THEN allowed := ARRAY['ready_for_pickup','cancelled'];
        WHEN 'ready_for_pickup' THEN allowed := ARRAY['rider_assigned','picked_up','out_for_delivery','cancelled'];
        WHEN 'rider_assigned' THEN allowed := ARRAY['rider_arriving','picked_up','cancelled'];
        WHEN 'rider_arriving' THEN allowed := ARRAY['picked_up','cancelled'];
        WHEN 'picked_up' THEN allowed := ARRAY['out_for_delivery'];
        WHEN 'out_for_delivery' THEN allowed := ARRAY['delivered','completed','delivery_attempted_failed'];
        WHEN 'delivered' THEN allowed := ARRAY['completed','disputed','returned'];
        WHEN 'completed' THEN allowed := ARRAY['disputed','refund_pending'];
        WHEN 'delivery_attempted_failed' THEN allowed := ARRAY['out_for_delivery','returned','cancelled','refund_pending'];
        WHEN 'cancelled' THEN allowed := ARRAY['refund_pending'];
        WHEN 'refund_pending' THEN allowed := ARRAY['refunded'];
        WHEN 'refunded' THEN allowed := ARRAY[]::TEXT[];
        WHEN 'disputed' THEN allowed := ARRAY['refund_pending','completed'];
        WHEN 'returned' THEN allowed := ARRAY['refund_pending'];
        ELSE allowed := ARRAY[]::TEXT[];
    END CASE;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status = ANY(allowed)) THEN
        RAISE EXCEPTION 'State Machine Violation: Cannot transition from "%" to "%". Allowed: %', OLD.status, NEW.status, allowed;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_enforce_order_state ON public.foody_orders;
CREATE TRIGGER trg_enforce_order_state BEFORE UPDATE OF status ON public.foody_orders FOR EACH ROW EXECUTE FUNCTION public.enforce_order_state_transition();

-- Seed fixtures
INSERT INTO public.foody_shops (id, name, address) VALUES ('test-shop-hardening', 'Test Shop', 'Addr') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.foody_roles (id, name, hierarchy_level) VALUES ('customer','Customer',1),('delivery','Delivery',2),('kitchen','Kitchen',3),('owner','Owner',4),('developer','Developer',5) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.foody_logged_users (id, display_name, email, role, shop_id) VALUES
  ('test-rider-A','Rider A','ra@t.com','delivery','test-shop-hardening'),
  ('test-rider-B','Rider B','rb@t.com','delivery','test-shop-hardening'),
  ('test-kitchen-1','Chef','ch@t.com','kitchen','test-shop-hardening')
ON CONFLICT (id) DO NOTHING;


-- ========================================================================
-- TEST 01: Illegal state transition (new → delivered)
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst01-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  BEGIN
    UPDATE public.foody_orders SET status='delivered' WHERE id=tid;
    INSERT INTO _test_results VALUES ('T01','Illegal: new→delivered','❌ FAIL','Transition was allowed');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T01','Illegal: new→delivered','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 02: Legal happy-path chain
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst02-' || substr(md5(random()::text),1,8); fs TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  UPDATE public.foody_orders SET status='confirmed' WHERE id=tid;
  UPDATE public.foody_orders SET status='cooking' WHERE id=tid;
  UPDATE public.foody_orders SET status='ready_for_pickup' WHERE id=tid;
  UPDATE public.foody_orders SET status='picked_up' WHERE id=tid;
  UPDATE public.foody_orders SET status='out_for_delivery' WHERE id=tid;
  UPDATE public.foody_orders SET status='delivered' WHERE id=tid;
  SELECT status INTO fs FROM public.foody_orders WHERE id=tid;
  IF fs='delivered' THEN
    INSERT INTO _test_results VALUES ('T02','Happy path chain','✅ PASS','new→confirmed→cooking→ready→picked_up→out→delivered');
  ELSE
    INSERT INTO _test_results VALUES ('T02','Happy path chain','❌ FAIL','Final: '||fs);
  END IF;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 03: Reverse transition (delivered → cooking)
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst03-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  UPDATE public.foody_orders SET status='confirmed' WHERE id=tid;
  UPDATE public.foody_orders SET status='cooking' WHERE id=tid;
  UPDATE public.foody_orders SET status='ready_for_pickup' WHERE id=tid;
  UPDATE public.foody_orders SET status='picked_up' WHERE id=tid;
  UPDATE public.foody_orders SET status='out_for_delivery' WHERE id=tid;
  UPDATE public.foody_orders SET status='delivered' WHERE id=tid;
  BEGIN
    UPDATE public.foody_orders SET status='cooking' WHERE id=tid;
    INSERT INTO _test_results VALUES ('T03','Reverse: delivered→cooking','❌ FAIL','Was allowed');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _test_results VALUES ('T03','Reverse: delivered→cooking','✅ PASS','Blocked');
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 04: Terminal state (refunded → new)
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst04-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  UPDATE public.foody_orders SET status='cancelled' WHERE id=tid;
  UPDATE public.foody_orders SET status='refund_pending' WHERE id=tid;
  UPDATE public.foody_orders SET status='refunded' WHERE id=tid;
  BEGIN
    UPDATE public.foody_orders SET status='new' WHERE id=tid;
    INSERT INTO _test_results VALUES ('T04','Terminal: refunded→new','❌ FAIL','Was allowed');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _test_results VALUES ('T04','Terminal: refunded→new','✅ PASS','Truly terminal');
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 05: Hash chain auto-computation
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst05-' || substr(md5(random()::text),1,8);
  h1 TEXT; h2p TEXT; h2 TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-kitchen-1','kitchen','EVT1_T05');
  SELECT event_hash INTO h1 FROM public.foody_order_events WHERE order_id=tid AND event_type='EVT1_T05' LIMIT 1;
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-rider-A','delivery','EVT2_T05');
  SELECT previous_event_hash, event_hash INTO h2p, h2 FROM public.foody_order_events WHERE order_id=tid AND event_type='EVT2_T05' LIMIT 1;
  IF h1 IS NOT NULL AND h1!='pending' AND h2p=h1 AND h2 IS NOT NULL AND h2!='pending' THEN
    INSERT INTO _test_results VALUES ('T05','Hash chain computation','✅ PASS','Chain linked: '||left(h1,12)||'→'||left(h2,12));
  ELSE
    INSERT INTO _test_results VALUES ('T05','Hash chain computation','❌ FAIL','h1='||COALESCE(h1,'NULL')||' h2p='||COALESCE(h2p,'NULL'));
  END IF;
END $$;

-- ========================================================================
-- TEST 06: Hash chain verification RPC
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst06-' || substr(md5(random()::text),1,8); result JSONB;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-kitchen-1','kitchen','EVT1_T06');
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-rider-A','delivery','EVT2_T06');
  SELECT public.verify_order_hash_chain(tid) INTO result;
  IF (result->>'chain_valid')::boolean=true AND (result->>'total_events')::int=2 THEN
    INSERT INTO _test_results VALUES ('T06','Hash chain RPC verify','✅ PASS', result::text);
  ELSE
    INSERT INTO _test_results VALUES ('T06','Hash chain RPC verify','❌ FAIL', result::text);
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T06','Hash chain RPC verify','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 07a: Audit UPDATE blocked
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst07-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-kitchen-1','kitchen','EVT_T07');
  BEGIN
    UPDATE public.foody_order_events SET event_type='TAMPERED' WHERE order_id=tid AND event_type='EVT_T07';
    INSERT INTO _test_results VALUES ('T07a','Audit UPDATE blocked','❌ FAIL','Update allowed');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T07a','Audit UPDATE blocked','✅ PASS', em);
  END;
END $$;

-- ========================================================================
-- TEST 07b: Audit DELETE blocked
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst07b-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-kitchen-1','kitchen','EVT_T07B');
  BEGIN
    DELETE FROM public.foody_order_events WHERE order_id=tid AND event_type='EVT_T07B';
    INSERT INTO _test_results VALUES ('T07b','Audit DELETE blocked','❌ FAIL','Delete allowed');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T07b','Audit DELETE blocked','✅ PASS', em);
  END;
END $$;

-- ========================================================================
-- TEST 08: FK RESTRICT — order deletion blocked
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst08-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  INSERT INTO public.foody_order_events (order_id,actor_id,actor_role,event_type) VALUES (tid,'test-kitchen-1','kitchen','EVT_T08');
  BEGIN
    DELETE FROM public.foody_orders WHERE id=tid;
    INSERT INTO _test_results VALUES ('T08','FK RESTRICT order delete','❌ FAIL','Order deleted despite events');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _test_results VALUES ('T08','FK RESTRICT order delete','✅ PASS','Blocked by FK');
  END;
END $$;

-- ========================================================================
-- TEST 09: Wrong pickup OTP rejected
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst09-' || substr(md5(random()::text),1,8); em TEXT; att INT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,'123456',NOW()+INTERVAL '30 min');
  BEGIN
    PERFORM public.claim_order_pickup_atomic(tid,'test-rider-A','WRONG');
    INSERT INTO _test_results VALUES ('T09','Wrong pickup OTP','❌ FAIL','Accepted');
  EXCEPTION WHEN OTHERS THEN
    SELECT pickup_otp_attempts INTO att FROM public.foody_orders WHERE id=tid;
    INSERT INTO _test_results VALUES ('T09','Wrong pickup OTP','✅ PASS','Rejected, attempts='||COALESCE(att::text,'?'));
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T09','Wrong pickup OTP','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 10: Correct pickup OTP accepted
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst10-' || substr(md5(random()::text),1,8); result JSONB; fs TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,'654321',NOW()+INTERVAL '30 min');
  SELECT public.claim_order_pickup_atomic(tid,'test-rider-A','654321') INTO result;
  SELECT status INTO fs FROM public.foody_orders WHERE id=tid;
  IF fs='picked_up' THEN
    INSERT INTO _test_results VALUES ('T10','Correct pickup OTP','✅ PASS','→ picked_up');
  ELSE
    INSERT INTO _test_results VALUES ('T10','Correct pickup OTP','❌ FAIL','Status='||COALESCE(fs,'NULL'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T10','Correct pickup OTP','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 11: Expired OTP blocked
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst11-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,'111111',NOW()-INTERVAL '1 hour');
  BEGIN
    PERFORM public.claim_order_pickup_atomic(tid,'test-rider-A','111111');
    INSERT INTO _test_results VALUES ('T11','Expired OTP','❌ FAIL','Accepted');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T11','Expired OTP','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 12: OTP rate limit (5+ attempts)
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst12-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp,pickup_otp_attempts,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,'999999',5,NOW()+INTERVAL '30 min');
  BEGIN
    PERFORM public.claim_order_pickup_atomic(tid,'test-rider-A','999999');
    INSERT INTO _test_results VALUES ('T12','OTP rate limit','❌ FAIL','Accepted at 5 attempts');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T12','OTP rate limit','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 13: Wrong rider delivery blocked
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst13-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,rider_id,delivery_otp,delivery_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','out_for_delivery','[{"n":"t"}]'::jsonb,100,'test-rider-A','777777',NOW()+INTERVAL '30 min');
  BEGIN
    PERFORM public.verify_delivery_otp_atomic(tid,'test-rider-B','777777');
    INSERT INTO _test_results VALUES ('T13','Wrong rider delivery','❌ FAIL','Wrong rider accepted');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T13','Wrong rider delivery','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 14: Correct delivery OTP → delivered
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst14-' || substr(md5(random()::text),1,8); result JSONB; fs TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,rider_id,delivery_otp,delivery_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','out_for_delivery','[{"n":"t"}]'::jsonb,100,'test-rider-A','888888',NOW()+INTERVAL '30 min');
  SELECT public.verify_delivery_otp_atomic(tid,'test-rider-A','888888') INTO result;
  SELECT status INTO fs FROM public.foody_orders WHERE id=tid;
  IF fs='delivered' THEN
    INSERT INTO _test_results VALUES ('T14','Correct delivery OTP','✅ PASS','→ delivered');
  ELSE
    INSERT INTO _test_results VALUES ('T14','Correct delivery OTP','❌ FAIL','Status='||COALESCE(fs,'NULL'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T14','Correct delivery OTP','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 15: Pickup from wrong state (cooking)
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst15-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100,'555555',NOW()+INTERVAL '30 min');
  UPDATE public.foody_orders SET status='confirmed' WHERE id=tid;
  UPDATE public.foody_orders SET status='cooking' WHERE id=tid;
  BEGIN
    PERFORM public.claim_order_pickup_atomic(tid,'test-rider-A','555555');
    INSERT INTO _test_results VALUES ('T15','Pickup from cooking','❌ FAIL','Allowed');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T15','Pickup from cooking','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T15','Pickup from cooking','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 16: Delivery verify from wrong state
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst16-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,rider_id,delivery_otp,delivery_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,'test-rider-A','444444',NOW()+INTERVAL '30 min');
  BEGIN
    PERFORM public.verify_delivery_otp_atomic(tid,'test-rider-A','444444');
    INSERT INTO _test_results VALUES ('T16','Delivery from wrong state','❌ FAIL','Allowed');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T16','Delivery from wrong state','✅ PASS', em);
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
END $$;

-- ========================================================================
-- TEST 17: Invalid role assignment
-- ========================================================================
DO $$
DECLARE em TEXT;
BEGIN
  BEGIN
    PERFORM public.set_user_role('test-rider-A','superadmin_fake');
    INSERT INTO _test_results VALUES ('T17','Invalid role assignment','❌ FAIL','Accepted');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS em = MESSAGE_TEXT;
    INSERT INTO _test_results VALUES ('T17','Invalid role assignment','✅ PASS', em);
  END;
END $$;

-- ========================================================================
-- TEST 18: COD computed columns
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst18-' || substr(md5(random()::text),1,8); cn NUMERIC; cd NUMERIC; sid UUID;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,250);
  INSERT INTO public.foody_cash_settlements (order_id,shop_id,rider_id,expected_amount,rider_declared_amount,cashier_received_amount,cash_received_from_customer,change_returned_to_customer,declared_by)
  VALUES (tid,'test-shop-hardening','test-rider-A',250,240,230,300,50,'test-rider-A') RETURNING id INTO sid;
  SELECT net_collected, difference INTO cn, cd FROM public.foody_cash_settlements WHERE id=sid;
  IF cn=250 AND cd=-10 THEN
    INSERT INTO _test_results VALUES ('T18','COD computed columns','✅ PASS','net='||cn||' diff='||cd);
  ELSE
    INSERT INTO _test_results VALUES ('T18','COD computed columns','❌ FAIL','net='||COALESCE(cn::text,'NULL')||' diff='||COALESCE(cd::text,'NULL'));
  END IF;
  DELETE FROM public.foody_cash_settlements WHERE id=sid;
  DELETE FROM public.foody_orders WHERE id=tid;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T18','COD computed columns','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 19: Cancel/refund race
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst19-' || substr(md5(random()::text),1,8); em TEXT;
BEGIN
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount) VALUES (tid,'test-shop-hardening','T','9','A','new','[{"n":"t"}]'::jsonb,100);
  UPDATE public.foody_orders SET status='cancelled' WHERE id=tid;
  -- Same-state no-op
  BEGIN
    UPDATE public.foody_orders SET status='cancelled' WHERE id=tid;
    INSERT INTO _test_results VALUES ('T19a','Cancel no-op','✅ PASS','Same-state accepted');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _test_results VALUES ('T19a','Cancel no-op','⚠️ INFO','Same-state blocked');
  END;
  -- Reversal blocked
  BEGIN
    UPDATE public.foody_orders SET status='new' WHERE id=tid;
    INSERT INTO _test_results VALUES ('T19b','Cancel reversal','❌ FAIL','cancelled→new allowed');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _test_results VALUES ('T19b','Cancel reversal','✅ PASS','cancelled→new blocked');
  END;
  DELETE FROM public.foody_orders WHERE id=tid;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T19','Cancel race','⚠️ ERROR', SQLERRM);
END $$;

-- ========================================================================
-- TEST 20: SHA-256 hashed OTP verification
-- ========================================================================
DO $$
DECLARE tid TEXT := 'tst20-' || substr(md5(random()::text),1,8); result JSONB; fs TEXT; oh TEXT;
BEGIN
  oh := encode(digest('314159','sha256'),'hex');
  INSERT INTO public.foody_orders (id,shop_id,customer_name,customer_phone,customer_address,status,items,total_amount,pickup_otp_hash,pickup_otp_expires_at) VALUES (tid,'test-shop-hardening','T','9','A','ready_for_pickup','[{"n":"t"}]'::jsonb,100,oh,NOW()+INTERVAL '30 min');
  SELECT public.claim_order_pickup_atomic(tid,'test-rider-A','314159') INTO result;
  SELECT status INTO fs FROM public.foody_orders WHERE id=tid;
  IF fs='picked_up' THEN
    INSERT INTO _test_results VALUES ('T20','SHA-256 OTP verify','✅ PASS','Hash-only → picked_up');
  ELSE
    INSERT INTO _test_results VALUES ('T20','SHA-256 OTP verify','❌ FAIL','Status='||COALESCE(fs,'NULL'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results VALUES ('T20','SHA-256 OTP verify','⚠️ ERROR', SQLERRM);
END $$;


-- ========================================================================
-- CLEANUP test fixtures
-- ========================================================================
DO $$ BEGIN
  DELETE FROM public.foody_orders WHERE id LIKE 'tst%' AND id NOT IN (SELECT DISTINCT order_id FROM public.foody_order_events WHERE order_id LIKE 'tst%');
  DELETE FROM public.foody_logged_users WHERE id IN ('test-rider-A','test-rider-B','test-kitchen-1');
  BEGIN DELETE FROM public.foody_shops WHERE id='test-shop-hardening'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- ========================================================================
-- FINAL RESULTS — This is what appears in the Results tab
-- ========================================================================
SELECT
  test_id AS "#",
  test_name AS "Test",
  result AS "Result",
  detail AS "Detail"
FROM _test_results
ORDER BY test_id;
