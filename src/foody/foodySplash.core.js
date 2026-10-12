// @ts-nocheck
/* Framework-agnostic pure vector letter morph splash animation for Foody Vrinda */
import sampledData from './foodySplashData.json';

export const G = [
  " M314,2041 C300,2041 286,2041 272,2041 C272,2045 272,2048 272,2052 C272,2080 272,2108 272,2136 C272,2142 271,2147 270,2153 C268,2163 262,2169 252,2172 C236,2176 221,2176 206,2172 C196,2169 189,2162 187,2151 C187,2145 186,2140 186,2135 C186,2044 186,1952 186,1861 C186,1855 187,1849 188,1843 C190,1831 198,1824 209,1822 C214,1821 220,1820 225,1820 C293,1820 361,1820 429,1820 C432,1820 436,1820 439,1821 C451,1824 459,1830 461,1843 C463,1857 463,1871 460,1885 C458,1895 452,1901 443,1903 C435,1905 428,1906 421,1906 C375,1906 329,1906 284,1906 C280,1906 277,1906 272,1906 C272,1915 272,1922 272,1930 C272,1938 272,1945 272,1954 C276,1954 280,1954 283,1954 C310,1954 337,1954 364,1954 C371,1954 377,1955 384,1956 C396,1957 404,1964 407,1976 C410,1990 411,2004 407,2018 C404,2033 396,2039 381,2040 C359,2041 337,2040 314,2041 z",
  " M549,1859 C577,1835 609,1820 646,1817 C684,1813 721,1821 754,1843 C794,1869 823,1904 833,1952 C848,2024 830,2087 776,2138 C745,2167 708,2180 666,2180 C588,2180 521,2133 496,2059 C473,1990 493,1907 549,1859 M723,2070 C737,2057 746,2041 750,2022 C753,2007 753,1991 750,1975 C742,1931 695,1891 641,1904 C608,1912 579,1945 574,1979 C572,1992 572,2004 574,2017 C580,2059 617,2093 659,2095 C683,2096 704,2087 723,2070 z",
  " M867,1957 C874,1925 887,1897 908,1874 C948,1832 996,1811 1053,1817 C1138,1824 1215,1899 1213,1998 C1212,2047 1196,2090 1163,2126 C1119,2173 1065,2189 1003,2177 C930,2163 873,2099 864,2026 C861,2003 862,1980 867,1957 M1127,1995 C1127,1992 1127,1989 1126,1985 C1122,1948 1102,1923 1069,1908 C1054,1901 1038,1900 1022,1903 C985,1911 956,1940 950,1977 C947,1992 947,2007 950,2022 C957,2058 991,2090 1027,2094 C1075,2100 1120,2064 1126,2015 C1127,2009 1127,2003 1127,1995 z",
  " M1244,2060 C1244,1993 1244,1928 1244,1862 C1244,1855 1245,1849 1246,1842 C1248,1831 1254,1824 1265,1822 C1272,1821 1279,1820 1285,1820 C1317,1820 1348,1820 1379,1820 C1419,1820 1454,1833 1485,1857 C1520,1885 1544,1920 1551,1964 C1570,2075 1490,2157 1411,2171 C1402,2173 1392,2174 1382,2174 C1349,2174 1317,2174 1285,2174 C1278,2174 1272,2173 1266,2172 C1255,2170 1249,2163 1247,2153 C1245,2146 1244,2138 1244,2131 C1244,2108 1244,2084 1244,2060 M1457,2042 C1463,2031 1466,2020 1467,2009 C1474,1961 1441,1916 1394,1908 C1388,1907 1383,1906 1378,1906 C1362,1906 1347,1906 1331,1906 C1329,1918 1330,2081 1332,2088 C1350,2088 1368,2088 1386,2088 C1389,2088 1392,2087 1394,2087 C1421,2081 1441,2066 1457,2042 z",
  " M1732,1920 C1748,1894 1764,1868 1780,1843 C1784,1836 1788,1830 1793,1824 C1801,1815 1811,1813 1822,1817 C1836,1821 1848,1829 1858,1840 C1866,1850 1869,1860 1862,1872 C1859,1878 1855,1884 1851,1890 C1819,1938 1787,1986 1755,2034 C1752,2039 1750,2043 1750,2049 C1750,2079 1750,2109 1750,2138 C1750,2145 1749,2152 1747,2158 C1745,2167 1738,2172 1729,2174 C1715,2177 1700,2177 1686,2174 C1677,2172 1670,2167 1668,2158 C1666,2151 1664,2144 1664,2138 C1664,2108 1664,2079 1664,2050 C1664,2043 1663,2038 1659,2033 C1626,1984 1594,1935 1561,1887 C1558,1881 1554,1875 1551,1869 C1547,1860 1548,1850 1555,1842 C1566,1830 1580,1821 1595,1816 C1604,1813 1613,1815 1619,1822 C1625,1828 1630,1835 1635,1842 C1657,1877 1679,1912 1701,1948 C1703,1951 1705,1954 1708,1958 C1716,1945 1724,1933 1732,1920 z",
  " M2298,2006 C2275,2053 2252,2100 2229,2147 C2223,2159 2214,2168 2201,2172 C2181,2178 2155,2173 2143,2148 C2099,2059 2055,1969 2011,1880 C2008,1875 2006,1870 2005,1865 C2002,1855 2003,1847 2011,1839 C2022,1829 2036,1822 2051,1818 C2065,1815 2073,1819 2080,1831 C2085,1838 2089,1846 2092,1854 C2122,1918 2151,1981 2180,2045 C2181,2048 2183,2051 2185,2056 C2187,2052 2189,2050 2190,2047 C2221,1979 2253,1910 2284,1842 C2286,1837 2289,1831 2292,1827 C2297,1820 2304,1817 2313,1817 C2331,1819 2347,1827 2360,1840 C2367,1847 2370,1856 2366,1865 C2364,1871 2361,1878 2358,1883 C2338,1924 2318,1965 2298,2006 z",
  " M2484,1820 C2504,1820 2523,1820 2542,1820 C2600,1821 2650,1859 2664,1915 C2675,1959 2668,1999 2637,2034 C2634,2037 2633,2040 2635,2045 C2645,2066 2654,2088 2663,2109 C2666,2116 2669,2123 2671,2130 C2675,2142 2672,2152 2662,2160 C2650,2169 2637,2175 2623,2177 C2609,2180 2598,2173 2592,2160 C2581,2137 2572,2113 2562,2090 C2560,2086 2558,2081 2556,2077 C2531,2077 2506,2077 2481,2077 C2480,2080 2480,2083 2480,2085 C2480,2101 2480,2117 2480,2132 C2480,2136 2480,2140 2480,2143 C2478,2161 2471,2169 2454,2173 C2441,2175 2429,2175 2416,2172 C2405,2169 2397,2162 2395,2149 C2395,2144 2394,2139 2394,2135 C2394,2042 2394,1950 2394,1858 C2394,1853 2395,1848 2396,1843 C2398,1832 2405,1824 2416,1822 C2422,1821 2428,1820 2434,1820 C2450,1820 2467,1820 2484,1820 M2499,1906 C2493,1906 2487,1906 2480,1906 C2480,1935 2480,1963 2480,1991 C2503,1991 2525,1992 2548,1990 C2562,1989 2574,1981 2580,1967 C2591,1943 2580,1917 2555,1908 C2549,1907 2544,1906 2538,1906 C2526,1906 2513,1906 2499,1906 z",
  " M2786,2076 C2786,2099 2786,2120 2786,2142 C2786,2160 2775,2175 2758,2180 C2736,2187 2713,2173 2708,2151 C2707,2147 2707,2142 2707,2137 C2706,2103 2707,2069 2707,2035 C2707,2021 2710,2009 2722,2000 C2734,1990 2748,1989 2762,1995 C2777,2001 2785,2013 2786,2029 C2786,2044 2786,2060 2786,2076 z",
  " M2870,2175 C2861,2174 2853,2174 2845,2172 C2834,2170 2828,2163 2826,2153 C2825,2148 2824,2143 2824,2138 C2824,2045 2824,1953 2824,1860 C2824,1854 2825,1849 2826,1843 C2828,1832 2835,1825 2845,1823 C2859,1820 2873,1820 2887,1823 C2894,1824 2901,1828 2905,1834 C2909,1839 2914,1844 2918,1849 C2959,1904 2999,1959 3040,2014 C3042,2017 3044,2019 3048,2024 C3048,2018 3049,2015 3049,2011 C3049,1963 3048,1915 3049,1867 C3049,1860 3049,1852 3050,1845 C3052,1833 3058,1826 3070,1823 C3084,1819 3099,1819 3114,1824 C3124,1826 3131,1833 3132,1844 C3133,1849 3134,1855 3134,1860 C3134,1953 3134,2046 3134,2138 C3134,2140 3134,2142 3134,2144 C3133,2162 3124,2172 3107,2174 C3096,2175 3084,2174 3073,2174 C3063,2173 3056,2167 3050,2159 C3029,2131 3007,2102 2985,2073 C2963,2043 2940,2014 2918,1984 C2916,1981 2914,1979 2910,1975 C2910,1980 2910,1984 2910,1987 C2910,2034 2910,2082 2910,2129 C2910,2135 2909,2142 2908,2148 C2906,2163 2900,2170 2885,2173 C2881,2174 2875,2174 2870,2175 z",
  " M3306,2174 C3276,2174 3246,2174 3217,2174 C3210,2174 3202,2173 3195,2172 C3184,2170 3177,2163 3175,2152 C3173,2145 3173,2137 3173,2130 C3172,2039 3172,1949 3173,1858 C3173,1853 3173,1848 3174,1843 C3176,1832 3182,1824 3194,1822 C3199,1821 3204,1820 3210,1820 C3245,1820 3281,1819 3317,1821 C3352,1822 3384,1835 3412,1857 C3444,1881 3467,1912 3477,1952 C3504,2067 3422,2156 3340,2171 C3329,2173 3318,2173 3306,2174 M3293,2089 C3302,2088 3312,2089 3321,2087 C3357,2080 3399,2047 3396,1992 C3394,1952 3363,1915 3324,1908 C3309,1906 3295,1906 3280,1906 C3273,1906 3266,1906 3259,1906 C3259,1967 3259,2027 3259,2089 C3270,2089 3280,2089 3293,2089 z",
  " M3501,2169 C3496,2165 3491,2162 3487,2159 C3477,2151 3475,2141 3479,2130 C3481,2125 3483,2121 3485,2116 C3528,2027 3571,1938 3614,1848 C3623,1831 3636,1821 3655,1820 C3670,1820 3681,1826 3689,1838 C3692,1842 3694,1846 3696,1850 C3738,1937 3781,2024 3823,2112 C3826,2118 3828,2124 3831,2130 C3835,2140 3833,2150 3825,2158 C3812,2169 3797,2177 3781,2179 C3768,2181 3758,2174 3753,2162 C3744,2145 3735,2127 3726,2109 C3725,2106 3723,2103 3722,2100 C3677,2100 3633,2100 3588,2100 C3586,2103 3584,2107 3583,2110 C3574,2127 3566,2145 3557,2162 C3549,2177 3537,2182 3522,2178 C3519,2177 3517,2176 3514,2175 C3510,2173 3506,2171 3501,2169 M3682,2017 C3673,1999 3664,1981 3655,1961 C3644,1984 3634,2005 3623,2027 C3645,2027 3665,2027 3686,2027 C3685,2024 3684,2021 3682,2017 z"
];

export const DOTD = " M2779,1961 C2755,1974 2731,1973 2709,1958 C2689,1945 2681,1921 2688,1898 C2690,1890 2694,1882 2699,1874 C2710,1853 2726,1835 2742,1818 C2743,1817 2745,1816 2746,1815 C2747,1816 2748,1816 2748,1816 C2769,1837 2787,1858 2800,1884 C2805,1896 2809,1907 2807,1920 C2805,1938 2795,1952 2779,1961 z";
export const ACD = " M308,358 C310,344 311,343 325,347 C329,348 333,350 337,352 C341,353 342,356 340,360 C339,364 337,367 335,371 C333,374 333,375 337,377 C344,380 351,384 357,390 C362,395 364,403 361,409 C358,416 353,419 345,419 C337,419 330,418 323,416 C316,415 314,418 316,424 C318,431 322,436 329,439 C331,440 333,441 335,442 C333,446 329,448 326,450 C315,457 304,460 292,461 C290,462 288,462 286,460 C279,453 273,446 269,437 C269,437 269,436 269,435 C272,435 275,434 278,434 C280,433 283,433 285,431 C289,428 290,425 285,422 C279,418 273,414 267,409 C264,406 263,403 264,398 C266,394 266,390 264,385 C260,374 267,364 279,363 C286,362 293,363 300,365 C307,366 307,366 308,358 z";

const CRM = '#FFF6EC';

// Pre-built markup (hardware accelerated, zero DOM re-parsing)
export const splashMarkup = `<svg style="position:absolute;inset:0;width:100%;height:100%;display:block;shape-rendering:geometricPrecision;transform-origin:50% 46%;backface-visibility:hidden;will-change:transform;" data-k="s" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid meet" aria-label="Foody Vrinda splash">
<defs>
  <radialGradient id="fvs-bg" gradientUnits="userSpaceOnUse" cx="540" cy="900" r="1000">
    <stop offset="0" stop-color="#FF9448"/>
    <stop offset="1" stop-color="#FF751F"/>
  </radialGradient>
  <linearGradient id="fvs-sh" gradientUnits="userSpaceOnUse" x1="0" y1="1880" x2="220" y2="2120">
    <stop offset="0" stop-color="#FF8A3D" stop-opacity="0"/>
    <stop offset=".5" stop-color="#FF8A3D" stop-opacity=".5"/>
    <stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="-4000" y="-4000" width="9080" height="9920" fill="url(#fvs-bg)"/>
<g data-k="wm" style="will-change:transform;backface-visibility:hidden;"></g>
</svg>`;

const N = 180;
const Cp = Array.from({ length: N }, (_, k) => {
  const a = (2 * Math.PI * k) / N;
  return [Math.sin(a), -Math.cos(a)];
});

// Pre-computed spring constants (removes Math.log from per-frame loops)
const A_05 = (12 * Math.log(1 / 0.05)) / Math.PI; // 11.4439
const A_03 = (12 * Math.log(1 / 0.03)) / Math.PI; // 13.3941
const A_10 = (12 * Math.log(1 / 0.10)) / Math.PI; // 8.7963
const A_20 = (12 * Math.log(1 / 0.20)) / Math.PI; // 6.1475

const uTable = new Float32Array(91);

/**
 * createFoodySplash - Zero-Lag 120fps Hardware-Accelerated Kinetic Engine
 * Grounded in pre-computed point cache with zero redundant DOM updates.
 */
export function createFoodySplash(root, opts = {}) {
  let dead = false;
  const $ = i => root.querySelector('[data-k="' + i + '"]');
  const S = $('s');
  const W = $('wm');
  const BG = root.querySelector('#fvs-bg');
  const SHG = root.querySelector('#fvs-sh');

  if (!W) return null;

  // Hydrate letter elements immediately with initial static shapes
  W.innerHTML = G.map((d, i) =>
    '<g class="L" style="opacity:0;will-change:transform,opacity;"><path fill-rule="evenodd" fill="' + CRM + '" d="' + d + '"/>' +
    (i === 7 ? '' : '<path class="sh" display="none" fill-rule="evenodd" fill="url(#fvs-sh)" d="' + d + '"/>') +
    '</g>'
  ).join('') + '<path data-k="dp" fill="' + CRM + '" display="none" style="will-change:transform;"/>';

  const Ls = [...root.querySelectorAll('.L')];
  const SHs = [...root.querySelectorAll('.sh')];
  const DP = $('dp');

  // Fast math primitives
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const eo = u => 1 - Math.pow(1 - u, 3);
  const sm = x => {
    x = cl(x);
    return x * x * (3 - 2 * x);
  };
  const spr = (x, aConst) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return 1 - Math.exp(-aConst * x) * Math.cos(12 * x);
  };
  const sq = (t, t0, d, a) => {
    const u = (t - t0) / d;
    return u < 0 || u > 1 ? 0 : a * Math.sin(Math.PI * u) * (1 - u);
  };

  // Real -> animation time warp: gentle slow-mo on acorn drop
  const WP = [[0, 0], [3.9, 3.9], [4.5, 4.3], [4.65, 4.4], [4.9, 4.55], [6.9, 6.55]];
  const warp = r => {
    for (let i = 1; i < WP.length; i++) {
      if (r <= WP[i][0]) {
        const [a, b] = WP[i - 1], [c, d] = WP[i];
        return lerp(b, d, (r - a) / (c - a));
      }
    }
    return WP[WP.length - 1][1] + (r - WP[WP.length - 1][0]);
  };

  // Camera keys [anim t, centreX, centreY, zoom, log(zoom)]
  const K = [
    [0, 325, 2000, 2.4, 0.8754687],
    [0.85, 700, 2000, 0.84, -0.1743534],
    [1.8, 1365, 2000, 0.82, -0.1984509],
    [2.7, 2405, 2000, 1.0, 0],
    [3.5, 2745, 1860, 1.9, 0.6418539],
    [5.05, 2010, 2000, 0.26, -1.3470736]
  ];
  const TB = [0.25, 1.2, 1.32, 2.1, 2.22, 3, 3.12, 0, 5.2, 5.32, 5.44];
  const WE = [0.85, 1.8, 1.8, 2.7, 2.7, 3.5, 3.5, 1e9, 1e9, 1e9, 1e9];
  const LX = [325, 660, 1038, 1405, 1708, 2186, 2534, 2746, 2979, 3338, 3655];

  const STILL = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches;
  const ce = x => {
    x = cl(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(2 - 2 * x, 3) / 2;
  };

  const SW = 0.2, DUR = 0.8, WV0 = 5.75, WVD = 1.1, SHT = 6.4, SHP = 4.5;

  // Ultra-fast zero-allocation path builder with integer bitwise coordinates
  const polyS = (s, sr, T, os) => {
    const aConst = os === 0.05 ? A_05 : (os === 0.03 ? A_03 : A_10);
    for (let d = 0; d <= 90; d++) {
      const xVal = (T - d * 0.00222222) * 1.25; // (SW * d / 90) / DUR
      if (xVal <= 0) {
        uTable[d] = 0;
      } else if (xVal >= 1) {
        uTable[d] = 1;
      } else {
        uTable[d] = 1 - Math.exp(-aConst * xVal) * Math.cos(12 * xVal);
      }
    }

    const pts = s.p;
    const len = pts.length;
    const cx = s.c[0], cy = s.c[1];
    let res = 'M';
    for (let k = 0; k < len; k++) {
      const u = uTable[k < 90 ? k : 180 - k];
      const cpk0 = Cp[k][0] * sr;
      const cpk1 = Cp[k][1] * sr;
      const x = ((cx + cpk0 + (pts[k][0] - cpk0) * u) + 0.5) | 0;
      const y = ((cy + cpk1 + (pts[k][1] - cpk1) * u) + 0.5) | 0;
      res += (k === 0 ? '' : 'L') + x + ' ' + y;
    }
    return res + 'Z';
  };

  function wave(i, t) {
    if (t < WV0) return [1, 0];
    const u = (t - WV0 - 0.06 * i) / WVD;
    let w = 0, h = 0;
    if (u > 0 && u < 1) {
      w = Math.sin(Math.PI * 3.2 * u) * Math.exp(-3.4 * u);
      h = u < 0.5 ? 64 * Math.sin(Math.PI * 2 * u) * (1 - u) : 0;
    }
    if (!STILL) h += 14 * Math.sin(t * 1.9 - i * 0.55) * sm((t - WV0 - 1.1) / 0.8);
    return [1 + 0.1 * w, h];
  }

  const { LS, AC, DT } = sampledData;

  // State tracking: Prevents calling setAttribute on finished / invisible elements
  const morphFinished = new Uint8Array(Ls.length);
  const lastOpacity = new Float32Array(Ls.length).fill(-1);
  let dpDone = false;
  let dpVisible = false;
  let shState = false;

  function render(t) {
    if (!W) return;

    // Smooth camera interpolation
    let x = K[0][1], y = K[0][2], lk = K[0][4];
    for (let j = 1; j < K.length; j++) {
      const u = ce((t - K[j][0]) * 1.25);
      x = lerp(x, K[j][1], u);
      y = lerp(y, K[j][2], u);
      lk = lerp(lk, K[j][4], u);
    }
    const dr = STILL ? 0 : 1;
    const tx = ((540 + 5 * dr * Math.sin(t * 1.1)) + 0.5) | 0;
    const ty = ((900 + 4 * dr * Math.sin(t * 0.8 + 1)) + 0.5) | 0;
    const sc = Math.round(Math.exp(lk) * 1000) / 1000;
    const rot = Math.round((0.5 * dr * Math.sin(t * 0.7)) * 100) / 100;
    const rx = ((-x) + 0.5) | 0;
    const ry = ((-y) + 0.5) | 0;

    W.setAttribute(
      'transform',
      `translate(${tx} ${ty}) rotate(${rot}) scale(${sc}) translate(${rx} ${ry})`
    );
    if (BG) BG.setAttribute('r', ((1000 + dr * 120 * Math.sin(t * 0.9)) + 0.5) | 0);

    for (let i = 0; i < Ls.length; i++) {
      const L = Ls[i];
      const P = L.firstChild;
      const [y2, hop] = wave(i, t);
      const hopR = Math.round(hop * 10) / 10;
      const y2R = Math.round(y2 * 1000) / 1000;
      const invY2 = Math.round((1 / y2) * 1000) / 1000;

      if (i === 7) {
        // Dot of 'i' (acorn drop handles its morph)
        const u = spr((t - 3.9) * 2.5, A_10);
        const op = u > 0 ? 1 : 0;
        if (op !== lastOpacity[7]) {
          L.style.opacity = op;
          lastOpacity[7] = op;
        }
        if (op > 0) {
          const uScale = Math.round(u * y2 * 1000) / 1000;
          L.setAttribute('transform', `translate(0 ${-hopR}) translate(2746 2187) scale(${invY2} ${uScale}) translate(-2746 -2187)`);
        }
      } else {
        const T = t - TB[i];
        const ap = eo(cl((T + 0.12) / 0.12));
        const e = eo(cl(T / 0.9));
        const r = Math.round(((1 - e) * (i % 2 ? 5 : -5)) * 100) / 100;
        const op = ap <= 0 ? 0 : Math.round(cl(1 - 0.65 * sm((t - WE[i]) / 0.25) + 0.65 * sm((t - 5.05) / 0.4)) * 100) / 100;

        // ONLY update SVG path 'd' while the letter is actively morphing!
        if (ap > 0 && LS[i]) {
          if (T >= 1.3) {
            if (!morphFinished[i]) {
              P.setAttribute('d', G[i]);
              morphFinished[i] = 1;
            }
          } else {
            P.setAttribute(
              'd',
              LS[i].length === 1
                ? polyS(LS[i][0], 60 * ap, T, 0.05)
                : polyS(LS[i][0], 60 * ap, T, 0.05) + polyS(LS[i][1], 3, T - 0.12, 0.03)
            );
          }
        }

        if (op !== lastOpacity[i]) {
          L.style.opacity = op;
          lastOpacity[i] = op;
        }

        if (op > 0) {
          const dy = Math.round(((1 - e) * 60 - hopR) * 10) / 10;
          L.setAttribute(
            'transform',
            `translate(0 ${dy}) rotate(${r} ${LX[i]} 2000) translate(${LX[i]} 2189) scale(${invY2} ${y2R}) translate(${-LX[i]} -2189)`
          );
        }
      }
    }

    // Light sweep shimmer across the finished letters
    const ph = ((t - SHT) % SHP) * 0.90909;
    const sw = !STILL && t > SHT && ph < 1;
    if (sw && SHG) SHG.setAttribute('gradientTransform', `translate(${Math.round(-500 + 4600 * ce(ph))} 0)`);
    if (sw !== shState) {
      shState = sw;
      const disp = sw ? '' : 'none';
      for (let i = 0; i < SHs.length; i++) {
        SHs[i].setAttribute('display', disp);
      }
    }

    // Acorn falls from above, squashes, and morphs into the dot of the "i"
    if (!DP) return;
    const [y7, h7] = wave(7, t);
    const h7R = Math.round(h7 * 10) / 10;
    const y7R = Math.round(y7 * 1000) / 1000;
    const invY7 = Math.round((1 / y7) * 1000) / 1000;
    DP.setAttribute('transform', `translate(0 ${-h7R}) translate(2746 2187) scale(${invY7} ${y7R}) translate(-2746 -2187)`);

    if (t < 4.05) {
      if (dpVisible) {
        DP.setAttribute('display', 'none');
        dpVisible = false;
      }
      return;
    }
    if (!dpVisible) {
      DP.setAttribute('display', '');
      dpVisible = true;
    }

    const v = cl((t - 4.05) * 2.8571);
    const u = spr((t - 4.4) * 2.0, A_20);
    if (u >= 1) {
      if (!dpDone) {
        DP.setAttribute('d', DOTD);
        dpDone = true;
      }
      return;
    }

    const cy = lerp(DT.c[1] - 650, DT.c[1], v * v);
    const an = 4 * Math.PI * v;
    const co = Math.cos(an);
    const si = Math.sin(an);
    const sy = 1 + 0.25 * v * (1 - cl((t - 4.4) / 0.06)) - sq(t, 4.4, 0.25, 0.3);

    let dAc = 'M';
    const acPts = AC.p;
    const dtPts = DT.p;
    const dtc0 = DT.c[0];
    for (let k = 0; k < acPts.length; k++) {
      const ax = (acPts[k][0] * co - acPts[k][1] * si) * 1.25;
      const ay = (acPts[k][0] * si + acPts[k][1] * co) * 1.25;
      const x = ((dtc0 + ax + (dtPts[k][0] - ax) * u) + 0.5) | 0;
      const y = ((cy + (ay + (dtPts[k][1] - ay) * u) * sy) + 0.5) | 0;
      dAc += (k === 0 ? '' : 'L') + x + ' ' + y;
    }
    DP.setAttribute('d', dAc + 'Z');
  }

  // Pre-render frame 0 immediately upon creation so there is zero delay or snap
  render(0);

  const DONE_REAL = 7.0; // Naturally complete after wordmark assemble & wave sweep
  const END_ANIM = 7.8;
  let t0, raf, done;
  const sp = opts.speed || 1.0; // Natural 1.0x designer timing

  function play() {
    cancelAnimationFrame(raf);
    done = false;
    t0 = performance.now();
    const f = n => {
      if (dead) return;
      const t = ((n - t0) / 1000) * sp;
      render(warp(t));
      if (t >= DONE_REAL && !done) {
        done = true;
        opts.onDone && opts.onDone();
      }
      if (t < END_ANIM + 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }

  if (STILL) {
    render(END_ANIM);
    setTimeout(() => opts.onDone && opts.onDone(), 400);
  } else if (opts.autoplay !== false) {
    play();
  }

  return {
    play,
    renderAt: t => render(warp(t)),
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
    }
  };
}
