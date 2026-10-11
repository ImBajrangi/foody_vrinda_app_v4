// @ts-nocheck
/* Generated from Foody Vrinda Mascot states: idle | happy | sad | delivery.
   Framework-agnostic core: createFoodyMascot(rootEl, opts) -> controller. */

let instanceCount = 0;

export const createMascotMarkup = (idPrefix = 'fvm') => `<svg style="display:block;width:100%;height:100%" data-k="s" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax meet" aria-label="Foody Vrinda squirrel mascot">
<defs><clipPath id="${idPrefix}-dc"><path d="M2568,3756 C2650,3731 2729,3702 2806,3667 C3007,3577 3187,3457 3346,3304 C3540,3119 3688,2902 3786,2652 C3859,2467 3899,2275 3908,2077 C3911,2005 3909,1933 3903,1861 C3897,1784 3886,1708 3870,1632 C3836,1471 3780,1318 3703,1173 C3624,1021 3524,884 3405,760 C3278,627 3135,515 2975,424 C2815,332 2646,265 2467,222 C2401,206 2334,192 2267,186 C2252,184 2238,182 2224,180 C2172,173 2120,170 2068,168 C2004,167 1941,168 1877,171 C1804,176 1731,185 1658,198 C1556,216 1455,242 1357,276 C1191,334 1035,413 890,513 C752,609 628,722 519,852 C382,1016 276,1199 203,1401 C138,1579 104,1763 99,1952 C96,2034 99,2116 109,2197 C117,2274 130,2351 149,2426 C192,2599 259,2762 350,2915 C459,3098 596,3256 760,3392 C861,3476 969,3549 1085,3611 C1216,3681 1354,3734 1497,3772 C1584,3795 1671,3812 1760,3822 C1809,3828 1859,3832 1908,3835 C1961,3838 2013,3838 2065,3837 C2146,3834 2227,3827 2307,3814 C2395,3801 2482,3782 2568,3756 z"/></clipPath></defs>
<rect data-k="bg" width="600" height="700" fill="none"/>
<g data-k="road" opacity="0"><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/><rect class="rd" y="664" width="80" height="8" rx="4" fill="#9A9A9F"/></g>
<g data-k="scene" opacity="0"><g data-k="box"><rect x="30" y="372" width="150" height="150" rx="20" fill="#FF751F" stroke="#1B1B1D" stroke-width="8"/><rect x="30" y="430" width="150" height="20" fill="#FFFEFD"/><rect x="88" y="372" width="22" height="150" fill="#FFFEFD" opacity=".9"/></g>
<g data-k="wb"><circle cx="150" cy="592" r="48" fill="#FFFEFD"/><circle cx="150" cy="592" r="30" fill="#1B1B1D"/><rect x="146" y="566" width="8" height="52" rx="4" fill="#FFFEFD"/></g>
<g data-k="wf"><circle cx="450" cy="592" r="48" fill="#FFFEFD"/><circle cx="450" cy="592" r="30" fill="#1B1B1D"/><rect x="446" y="566" width="8" height="52" rx="4" fill="#FFFEFD"/></g>
<rect x="110" y="514" width="380" height="30" rx="15" fill="#FF751F" stroke="#1B1B1D" stroke-width="6"/></g>
<g data-k="emb"><g clip-path="url(#${idPrefix}-dc)"><path fill="#FFFEFD" d="M2568,3756 C2650,3731 2729,3702 2806,3667 C3007,3577 3187,3457 3346,3304 C3540,3119 3688,2902 3786,2652 C3859,2467 3899,2275 3908,2077 C3911,2005 3909,1933 3903,1861 C3897,1784 3886,1708 3870,1632 C3836,1471 3780,1318 3703,1173 C3624,1021 3524,884 3405,760 C3278,627 3135,515 2975,424 C2815,332 2646,265 2467,222 C2401,206 2334,192 2267,186 C2252,184 2238,182 2224,180 C2172,173 2120,170 2068,168 C2004,167 1941,168 1877,171 C1804,176 1731,185 1658,198 C1556,216 1455,242 1357,276 C1191,334 1035,413 890,513 C752,609 628,722 519,852 C382,1016 276,1199 203,1401 C138,1579 104,1763 99,1952 C96,2034 99,2116 109,2197 C117,2274 130,2351 149,2426 C192,2599 259,2762 350,2915 C459,3098 596,3256 760,3392 C861,3476 969,3549 1085,3611 C1216,3681 1354,3734 1497,3772 C1584,3795 1671,3812 1760,3822 C1809,3828 1859,3832 1908,3835 C1961,3838 2013,3838 2065,3837 C2146,3834 2227,3827 2307,3814 C2395,3801 2482,3782 2568,3756 z"/>
<g data-k="mas"><path fill="#FF751F" d="M1700,660 C1730,714 1772,757 1821,794 C1864,826 1910,851 1957,876 C2032,915 2111,947 2189,980 C2255,1008 2321,1036 2385,1068 C2503,1128 2614,1200 2712,1290 C2885,1451 3004,1644 3062,1875 C3072,1914 3080,1955 3085,1995 C3097,2078 3100,2160 3094,2243 C3093,2273 3090,2303 3087,2333 C3065,2513 3009,2682 2934,2846 C2918,2881 2901,2916 2885,2952 C2880,2961 2874,2970 2866,2977 C2862,2981 2858,2981 2853,2979 C2846,2976 2841,2971 2838,2964 C2835,2957 2833,2950 2830,2942 C2805,2862 2778,2781 2753,2700 C2699,2524 2651,2346 2611,2166 C2587,2059 2565,1952 2548,1845 C2539,1790 2530,1736 2523,1682 C2517,1638 2513,1594 2508,1551 C2503,1506 2498,1461 2493,1416 C2490,1396 2488,1376 2486,1356 C2484,1337 2482,1319 2480,1300 C2470,1302 2463,1306 2457,1312 C2451,1319 2444,1326 2440,1334 C2424,1364 2407,1394 2392,1424 C2381,1446 2371,1469 2360,1492 C2357,1499 2353,1507 2349,1514 C2334,1541 2311,1551 2281,1547 C2259,1544 2237,1539 2215,1535 C2169,1527 2122,1521 2075,1518 C2026,1514 1977,1514 1929,1516 C1874,1518 1820,1524 1766,1533 C1738,1538 1709,1544 1681,1549 C1678,1549 1675,1550 1672,1550 C1654,1551 1640,1544 1630,1528 C1624,1518 1619,1507 1614,1496 C1599,1464 1584,1431 1568,1400 C1550,1365 1528,1332 1504,1302 C1502,1299 1499,1296 1496,1293 C1495,1296 1494,1298 1494,1300 C1485,1370 1477,1439 1469,1509 C1462,1565 1456,1621 1450,1676 C1435,1795 1416,1914 1390,2031 C1349,2208 1305,2384 1254,2559 C1246,2587 1237,2616 1229,2644 C1228,2645 1228,2646 1227,2649 C1225,2647 1223,2645 1221,2644 C1151,2556 1088,2463 1036,2363 C980,2255 938,2141 911,2022 C899,1969 890,1915 884,1860 C875,1780 873,1699 876,1618 C885,1423 924,1234 998,1053 C1056,914 1132,785 1225,667 C1321,542 1432,431 1554,332 C1594,300 1635,269 1675,238 C1677,236 1680,234 1684,231 C1685,237 1686,242 1686,246 C1688,275 1683,304 1675,332 C1665,366 1658,400 1655,435 C1648,514 1660,590 1700,660 z"/><g data-k="nz"><path fill="#FF7620" d="M2101,2147 C2107,2152 2114,2157 2119,2162 C2133,2177 2137,2194 2133,2214 C2129,2232 2119,2248 2107,2262 C2105,2266 2100,2268 2096,2270 C2085,2276 2073,2281 2062,2286 C2054,2289 2047,2292 2040,2295 C2017,2306 2006,2325 2006,2350 C2006,2357 2006,2363 1999,2367 C1985,2376 1965,2366 1963,2350 C1963,2345 1963,2341 1962,2336 C1961,2319 1953,2306 1938,2298 C1930,2294 1921,2291 1913,2288 C1901,2283 1887,2279 1875,2273 C1845,2256 1831,2227 1836,2194 C1838,2177 1848,2163 1862,2152 C1882,2137 1904,2129 1928,2122 C1989,2106 2046,2116 2101,2147 z"/></g>
<g data-k="eL"><path fill="#FF7620" d="M1685,2097 C1679,2106 1675,2116 1668,2123 C1649,2143 1626,2142 1608,2122 C1598,2110 1593,2096 1588,2082 C1580,2055 1579,2029 1585,2002 C1588,1990 1591,1977 1595,1965 C1595,1962 1597,1959 1598,1956 C1606,1939 1618,1929 1637,1928 C1657,1928 1673,1936 1681,1955 C1691,1974 1695,1995 1698,2017 C1702,2045 1697,2071 1685,2097 z"/></g><g data-k="eR"><path fill="#FF7620" d="M2288,1962 C2292,1954 2295,1947 2300,1940 C2309,1929 2321,1925 2335,1928 C2347,1931 2357,1936 2364,1948 C2384,1981 2390,2017 2385,2055 C2383,2069 2379,2084 2375,2098 C2374,2105 2371,2112 2367,2118 C2352,2142 2320,2145 2301,2125 C2296,2119 2291,2111 2288,2104 C2269,2061 2267,2017 2283,1973 C2285,1969 2286,1966 2288,1962 z"/></g>
<path data-k="brow" fill="none" stroke="#FF751F" stroke-width="34" stroke-linecap="round" d="M1520 1905L1740 1815M2450 1905L2230 1815" opacity="0"/>
<path data-k="mouth" fill="none" stroke="#FF751F" stroke-width="30" stroke-linecap="round" d="" opacity="0"/>
<path data-k="tL" fill="#FF751F" d="M0-90C50-10 80 30 80 70A80 80 0 1 1-80 70C-80 30-50-10 0-90Z" opacity="0"/><path data-k="tR" fill="#FF751F" d="M0-90C50-10 80 30 80 70A80 80 0 1 1-80 70C-80 30-50-10 0-90Z" opacity="0"/>
<g data-k="acA"><path fill="#FF751F" d="M1879,3809 C1859,3812 1839,3816 1820,3818 C1806,3819 1792,3819 1778,3818 C1765,3818 1754,3812 1745,3803 C1665,3726 1595,3641 1545,3542 C1541,3533 1540,3525 1541,3516 C1549,3514 1558,3513 1566,3512 C1596,3507 1627,3504 1657,3498 C1693,3491 1725,3474 1752,3448 C1775,3425 1775,3402 1752,3379 C1744,3371 1736,3364 1727,3358 C1680,3325 1633,3294 1587,3261 C1566,3246 1545,3229 1525,3213 C1509,3200 1496,3184 1489,3165 C1480,3143 1481,3120 1487,3097 C1492,3080 1497,3064 1500,3047 C1506,3010 1500,2973 1487,2937 C1481,2921 1476,2904 1473,2886 C1461,2813 1495,2740 1560,2703 C1594,2684 1631,2674 1670,2672 C1739,2669 1807,2676 1875,2689 C1901,2694 1927,2698 1952,2703 C1955,2703 1957,2703 1960,2703 C1974,2703 1984,2697 1988,2683 C1991,2673 1994,2662 1996,2652 C2001,2621 2005,2590 2010,2559 C2013,2543 2017,2528 2022,2512 C2023,2507 2026,2502 2028,2498 C2038,2477 2055,2467 2078,2466 C2096,2465 2115,2469 2133,2473 C2190,2488 2245,2508 2300,2531 C2312,2535 2324,2540 2335,2545 C2343,2548 2352,2552 2359,2557 C2380,2572 2388,2592 2383,2616 C2381,2626 2377,2636 2373,2646 C2355,2685 2335,2723 2313,2761 C2308,2769 2303,2778 2300,2786 C2294,2803 2297,2815 2310,2826 C2317,2831 2325,2836 2333,2840 C2371,2859 2409,2878 2447,2899 C2490,2923 2529,2951 2564,2986 C2597,3020 2619,3059 2629,3105 C2637,3146 2633,3185 2612,3222 C2603,3237 2594,3251 2582,3265 C2550,3303 2508,3325 2457,3330 C2426,3334 2394,3332 2363,3329 C2302,3324 2243,3311 2184,3299 C2163,3295 2143,3291 2122,3294 C2116,3295 2110,3296 2104,3299 C2086,3306 2079,3321 2079,3339 C2078,3351 2080,3362 2083,3373 C2095,3420 2117,3462 2151,3498 C2174,3522 2201,3540 2232,3554 C2255,3565 2278,3577 2301,3588 C2302,3589 2303,3590 2306,3591 C2303,3598 2300,3605 2296,3611 C2284,3633 2267,3649 2247,3664 C2166,3722 2078,3764 1981,3788 C1948,3796 1914,3802 1879,3809 z"/></g></g></g>
<g data-k="cap" opacity="0"><path d="M1520 360Q1520-80 2003-80Q2486-80 2486 360Z" fill="#FF751F" stroke="#1B1B1D" stroke-width="44" stroke-linejoin="round"/><rect x="1520" y="250" width="966" height="110" fill="#FFFEFD"/><path d="M2300 250H2980Q3020 250 3020 330V345H2300Z" fill="#FF751F" stroke="#1B1B1D" stroke-width="40" stroke-linejoin="round"/></g></g>
<g data-k="hnd" opacity="0"><rect x="474" y="404" width="20" height="120" rx="10" fill="#FF751F" stroke="#1B1B1D" stroke-width="6" transform="rotate(10 484 460)"/><rect x="452" y="396" width="64" height="20" rx="10" fill="#FFFEFD"/></g>
<g data-k="acF" display="none"><path fill="#FF751F" stroke="#FFFEFD" stroke-width="130" stroke-linejoin="round" paint-order="stroke" d="M1879,3809 C1859,3812 1839,3816 1820,3818 C1806,3819 1792,3819 1778,3818 C1765,3818 1754,3812 1745,3803 C1665,3726 1595,3641 1545,3542 C1541,3533 1540,3525 1541,3516 C1549,3514 1558,3513 1566,3512 C1596,3507 1627,3504 1657,3498 C1693,3491 1725,3474 1752,3448 C1775,3425 1775,3402 1752,3379 C1744,3371 1736,3364 1727,3358 C1680,3325 1633,3294 1587,3261 C1566,3246 1545,3229 1525,3213 C1509,3200 1496,3184 1489,3165 C1480,3143 1481,3120 1487,3097 C1492,3080 1497,3064 1500,3047 C1506,3010 1500,2973 1487,2937 C1481,2921 1476,2904 1473,2886 C1461,2813 1495,2740 1560,2703 C1594,2684 1631,2674 1670,2672 C1739,2669 1807,2676 1875,2689 C1901,2694 1927,2698 1952,2703 C1955,2703 1957,2703 1960,2703 C1974,2703 1984,2697 1988,2683 C1991,2673 1994,2662 1996,2652 C2001,2621 2005,2590 2010,2559 C2013,2543 2017,2528 2022,2512 C2023,2507 2026,2502 2028,2498 C2038,2477 2055,2467 2078,2466 C2096,2465 2115,2469 2133,2473 C2190,2488 2245,2508 2300,2531 C2312,2535 2324,2540 2335,2545 C2343,2548 2352,2552 2359,2557 C2380,2572 2388,2592 2383,2616 C2381,2626 2377,2636 2373,2646 C2355,2685 2335,2723 2313,2761 C2308,2769 2303,2778 2300,2786 C2294,2803 2297,2815 2310,2826 C2317,2831 2325,2836 2333,2840 C2371,2859 2409,2878 2447,2899 C2490,2923 2529,2951 2564,2986 C2597,3020 2619,3059 2629,3105 C2637,3146 2633,3185 2612,3222 C2603,3237 2594,3251 2582,3265 C2550,3303 2508,3325 2457,3330 C2426,3334 2394,3332 2363,3329 C2302,3324 2243,3311 2184,3299 C2163,3295 2143,3291 2122,3294 C2116,3295 2110,3296 2104,3299 C2086,3306 2079,3321 2079,3339 C2078,3351 2080,3362 2083,3373 C2095,3420 2117,3462 2151,3498 C2174,3522 2201,3540 2232,3554 C2255,3565 2278,3577 2301,3588 C2302,3589 2303,3590 2306,3591 C2303,3598 2300,3605 2296,3611 C2284,3633 2267,3649 2247,3664 C2166,3722 2078,3764 1981,3788 C1948,3796 1914,3802 1879,3809 z"/></g></svg>`;

export function createFoodyMascot(root, opts = {}) {
  let dead = false;
  const $ = i => root.querySelector('[data-k="' + i + '"]');
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const eo = u => 1 - Math.pow(1 - u, 3);
  const spr = (x, os = 0.1) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const w = 12, a = (w * Math.log(1 / os)) / Math.PI;
    return 1 - Math.exp(-a * x) * Math.cos(w * x);
  };
  const sq = (t, t0, d, a) => {
    const u = (t - t0) / d;
    return u < 0 || u > 1 ? 0 : a * Math.sin(Math.PI * u) * (1 - u);
  };
  const osc = (t, t0, a, f, dc) => (t > t0 ? a * Math.exp(-dc * (t - t0)) * Math.sin(f * (t - t0)) : 0);

  const BG = opts.background || 'transparent';
  const bgEl = $('bg');
  if (bgEl && BG !== 'transparent') bgEl.setAttribute('fill', BG);

  const E0 = 380 / 3815, DUR = 1.75, TT = 0.34, TC = 1.02;
  const NEU = { x: 300, gy: 650, h: 0, sy: 1, sk: 0, rot: 0, eb: 1, ly: 0, gx: 0, br: 0, mo: 0, dl: 0, bk: 1 };
  const hopY = t => (t > 0.3 && t < 0.8 ? 150 * 4 * ((t - 0.3) / 0.5) * (1 - (t - 0.3) / 0.5) : 0);

  function st(t) {
    let sy;
    if (t < 0.3) sy = 1 - 0.14 * eo(t / 0.3);
    else if (t < 0.8) {
      const u = (t - 0.3) / 0.5;
      sy = lerp(0.86, 1 + 0.1 * Math.sin(Math.PI * u), eo(cl((t - 0.3) / 0.08)));
    } else sy = 1 - sq(t, 0.8, 0.35, 0.2);
    return { sy, h: hopY(t) };
  }

  const aX = sy => 300 + 45.5 * E0 / sy;
  const aY = (h, sy, gy = 650) => gy - h - 696 * E0 * sy;

  function params(s, t) {
    const p = { ...NEU };
    const bt = t > 1.9 ? (t - 1.9) % 3.2 : 0;
    p.bk = bt > 3 && bt < 3.16 ? 1 - 0.92 * Math.sin(Math.PI * (bt - 3) / 0.16) : 1;

    if (s === 'idle') {
      p.sy = 1 + 0.008 * Math.sin(t * 6);
      p.sk = 1.2 * Math.sin(t * 3.2);
    } else if (s === 'happy') {
      p.eb = 1 - 0.55 * eo(cl((t - 0.28) / 0.08));
      p.mo = eo(cl((t - 0.28) / 0.1));
      if (t < DUR) {
        const a = st(t), u = t > 0.3 && t < 0.8 ? (t - 0.3) / 0.5 : 0;
        p.sy = a.sy;
        p.h = a.h;
        p.sk = osc(t, 0.3, -6, 22, 4) + osc(t, 0.8, 7, 24, 5) + osc(t, 1.05, 3, 24, 6);
        p.rot = -6 * Math.sin(Math.PI * u) + osc(t, 0.8, 3, 20, 5);
        p.ly = 45 * eo(cl((t - 0.32) / 0.15)) * (1 - eo(cl((t - 0.8) / 0.15)));
      } else {
        const u = ((t - DUR) % 0.9) / 0.9;
        p.h = 36 * 4 * u * (1 - u);
        p.sy = 1 + 0.05 * Math.sin(2 * Math.PI * u);
        p.sk = 7 * Math.sin(t * 14);
      }
    } else if (s === 'sad') {
      const e = eo(cl(t / 0.5));
      p.sy = lerp(1, 0.94, e) - sq(t % 2.4, 1.7, 0.5, 0.05);
      p.eb = lerp(1, 0.8, e);
      p.ly = -55 * e;
      p.br = e;
      p.mo = -e;
      p.rot = -3 * e;
      p.sk = -5 * e + 1.5 * Math.sin(t * 2);
    } else if (s === 'delivery') {
      p.dl = 1;
      p.gy = 520;
      p.h = 7 * Math.abs(Math.sin(t * 5));
      p.sy = 1 + 0.02 * Math.sin(t * 10);
      p.sk = 7 * Math.sin(t * 11);
      p.gx = 45;
      p.mo = 0.6;
      p.rot = 2;
    }
    return p;
  }

  let S = opts.state || 'idle';
  let ts = performance.now() / 1000;
  let P0 = null;
  let PL = { ...NEU };

  function setState(s) {
    if (s === S && s !== 'happy') return;
    P0 = { ...PL };
    S = s;
    ts = performance.now() / 1000;
  }

  function render(now) {
    if (dead) return;
    const t = now - ts;
    const Pt = params(S, t);
    let P = Pt;
    if (P0 && t < 0.25) {
      const w = eo(t / 0.25);
      P = {};
      for (const k in NEU) P[k] = lerp(P0[k], Pt[k], w);
    }
    PL = P;

    const dx = S === 'delivery' ? -700 * (1 - spr(t / 0.9)) : 0;
    const emb = $('emb');
    if (emb) emb.setAttribute('transform', `translate(${P.x + dx},${P.gy - P.h}) scale(${E0 / P.sy},${E0 * P.sy}) translate(-2003.5,-3838)`);

    const mas = $('mas');
    if (mas) mas.setAttribute('transform', `rotate(${P.rot} 2003 3300) translate(2003,3838) skewX(${P.sk}) translate(-2003,-3838)`);

    const b = P.eb * P.bk;
    const ly = P.ly;

    const eL = $('eL');
    if (eL) eL.setAttribute('transform', `translate(${P.gx},${-ly}) translate(1640,2036) scale(1,${b}) translate(-1640,-2036)`);
    const eR = $('eR');
    if (eR) eR.setAttribute('transform', `translate(${P.gx},${-ly}) translate(2328,2035) scale(1,${b}) translate(-2328,-2035)`);

    const nz = $('nz');
    if (nz) nz.setAttribute('transform', `translate(${P.gx * 0.6},${-ly})`);

    const brow = $('brow');
    if (brow) brow.setAttribute('opacity', P.br);

    const mouth = $('mouth');
    if (mouth) {
      mouth.setAttribute('opacity', Math.abs(P.mo) > 0.05 ? 1 : 0);
      mouth.setAttribute('d', `M1860 2425Q1984 ${2425 + 95 * P.mo} 2108 2425`);
    }

    const tL = $('tL');
    const tR = $('tR');
    if (tL && tR) {
      const teardrops = [[tL, 0, 1640], [tR, 0.5, 2328]];
      for (const [el, ph, cx] of teardrops) {
        const q = S === 'sad' ? ((t / 2.2 + ph) % 1) : -1;
        if (q < 0 || t < 0.6) {
          el.setAttribute('opacity', 0);
        } else {
          el.setAttribute('opacity', q > 0.75 ? 1 - (q - 0.75) * 4 : 1);
          el.setAttribute('transform', `translate(${cx},${2230 + q * q * 650}) scale(${cl(q * 8) * 0.9})`);
        }
      }
    }

    const scene = $('scene');
    if (scene) {
      scene.setAttribute('opacity', P.dl);
      scene.setAttribute('transform', `translate(${dx},0)`);
    }

    const road = $('road');
    if (road) road.setAttribute('opacity', P.dl);

    const cap = $('cap');
    if (cap) cap.setAttribute('opacity', P.dl);

    const hnd = $('hnd');
    if (hnd) {
      hnd.setAttribute('opacity', P.dl);
      hnd.setAttribute('transform', `translate(${dx},0)`);
    }

    const box = $('box');
    if (box) box.setAttribute('transform', `translate(0,${-5 * Math.abs(Math.sin(t * 5 + 0.9))})`);

    const wb = $('wb');
    if (wb) wb.setAttribute('transform', `rotate(${t * 700} 150 592)`);

    const wf = $('wf');
    if (wf) wf.setAttribute('transform', `rotate(${t * 700} 450 592)`);

    const rds = root.querySelectorAll('.rd');
    rds.forEach((r, i) => r.setAttribute('x', ((i * 140 - (S === 'delivery' ? t : 0) * 420) % 840 + 840) % 840 - 140));

    // Acorn physics
    const acF = $('acF');
    const acA = $('acA');
    if (acF && acA) {
      let fly = false, x = 0, y = 0, as = 1, rot = 0, s = 0;
      if (S === 'happy' && t >= TT && t < TC) {
        fly = true;
        const w = (t - TT) / (TC - TT);
        const a = st(TT), c = st(TC);
        x = lerp(aX(a.sy), aX(c.sy), w) + 120 * Math.sin(Math.PI * w);
        y = lerp(aY(a.h, a.sy), aY(c.h, c.sy), w) - 330 * 4 * w * (1 - w);
        as = 1 + 0.25 * Math.pow(Math.abs(1 - 2 * w), 2);
        rot = 360 * eo(w);
      } else if (S === 'sad' && t >= 0.4) {
        fly = true;
        const u = cl((t - 0.4) / 1);
        x = lerp(305, 470, eo(u));
        y = lerp(581, 632, u * u) - 90 * (1 - u) * Math.abs(Math.sin(3 * Math.PI * u));
        rot = 360 * eo(u);
      } else if (S === 'happy') {
        s = sq(t, TC, 0.2, 0.3);
      }

      acA.setAttribute('display', fly ? 'none' : '');
      acA.setAttribute('transform', `translate(2049,3142) scale(${1 + s},${1 - s}) translate(-2049,-3142)`);

      acF.setAttribute('display', fly ? '' : 'none');
      if (fly) {
        acF.setAttribute('transform', `translate(${x},${y}) scale(${E0 / as},${E0 * as}) rotate(${rot}) translate(-2049,-3142)`);
      }
    }
  }

  let raf;
  function loop(n) {
    if (dead) return;
    render(n / 1000);
    raf = requestAnimationFrame(loop);
  }

  if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
    render(ts + 2);
  } else {
    raf = requestAnimationFrame(loop);
  }

  return {
    set: setState,
    renderAt: t => render(t),
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
    }
  };
}
