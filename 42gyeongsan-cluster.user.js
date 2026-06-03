// ==UserScript==
// @name         42 경산 클러스터 지도
// @namespace    https://meta.intra.42.fr/
// @version      2.5
// @description  42 경산 c1/c2/c3 클러스터 실시간 배치도 — 우측 하단 버튼
// @updateURL    https://raw.githubusercontent.com/gytjr8422/clusters/main/42gyeongsan-cluster.user.js
// @downloadURL  https://raw.githubusercontent.com/gytjr8422/clusters/main/42gyeongsan-cluster.user.js
// @match        https://profile-v3.intra.42.fr/*
// @grant        GM_xmlhttpRequest
// @connect      meta.intra.42.fr
// ==/UserScript==

(function () {
  'use strict';

  const OCCUPIED = '#00babc';
  const EMPTY    = '#e5e5e5';
  const NS       = 'http://www.w3.org/2000/svg';

  /* ── 스타일 ── */
  const style = document.createElement('style');
  style.textContent = `
    #c42-btn {
      position: fixed; bottom: 24px; right: 24px;
      width: 52px; height: 52px; border-radius: 50%;
      background: #00babc; color: #fff; font-size: 22px;
      border: none; cursor: pointer; z-index: 99998;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    #c42-btn:hover { background: #009fa1; }

    #c42-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.72); z-index: 99999;
      align-items: center; justify-content: center;
    }
    #c42-overlay.open { display: flex; }

    #c42-panel {
      background: #1a1a1a; border-radius: 14px;
      padding: 20px 20px 16px; position: relative;
      max-width: 95vw; max-height: 95vh; overflow: auto;
    }
    #c42-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 6px;
    }
    #c42-panel h2 {
      color: #ccc; font-family: Helvetica, Arial, sans-serif;
      font-size: 21px; margin: 0; letter-spacing: .5px;
    }
    #c42-close {
      position: absolute; top: 14px; right: 16px;
      background: none; border: none; color: #777;
      font-size: 22px; cursor: pointer; line-height: 1; padding: 0;
    }
    #c42-close:hover { color: #fff; }

    #c42-tabs {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
    }
    #c42-tab-left { display: flex; gap: 6px; }
    .c42-tab {
      background: #2a2a2a; border: 1px solid #444; color: #888;
      border-radius: 6px; padding: 5px 20px; font-size: 16px;
      font-weight: bold; cursor: pointer; font-family: Helvetica, Arial, sans-serif;
      transition: all .15s;
    }
    .c42-tab:hover { border-color: #00babc; color: #ccc; }
    .c42-tab.active { background: #00babc; border-color: #00babc; color: #fff; }

    #c42-status {
      color: #666; font-size: 15px;
      font-family: Helvetica, Arial, sans-serif;
      margin-bottom: 10px;
    }
    #c42-refresh {
      background: none; border: 1px solid #444; color: #aaa;
      border-radius: 4px; padding: 2px 10px; font-size: 13px;
      cursor: pointer; margin-left: 8px;
    }
    #c42-refresh:hover { border-color: #00babc; color: #00babc; }

    #c42-default-bar {
      display: flex; align-items: center; gap: 6px;
      font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #666;
    }
    .c42-default-btn {
      background: #2a2a2a; border: 1px solid #444; color: #666;
      border-radius: 4px; padding: 3px 10px; font-size: 14px;
      cursor: pointer; transition: all .15s;
    }
    .c42-default-btn:hover { border-color: #00babc; color: #ccc; }
    .c42-default-btn.active { background: #00babc22; border-color: #00babc; color: #00babc; font-weight: bold; }

    .c42-svg-wrap { display: none; }
    .c42-svg-wrap.active { display: block; }

    #c42-tooltip {
      position: fixed; background: rgba(20,20,20,0.93);
      border-radius: 10px; padding: 8px 10px; display: none;
      z-index: 100000; pointer-events: auto;
      font-family: Helvetica, Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.55);
      text-align: center; min-width: 90px;
    }
    #c42-tooltip img {
      width: 140px; height: 140px; border-radius: 50%;
      display: block; object-fit: cover; margin: 0 auto;
    }
    #c42-tooltip span {
      display: block; color: #fff; font-size: 12px; font-weight: bold;
      margin-top: 6px; white-space: nowrap;
    }
    #c42-tooltip-star {
      background: none; border: none; color: #555; font-size: 20px;
      cursor: pointer; padding: 2px 0 0; display: block;
      width: 100%; text-align: center; line-height: 1;
    }
    #c42-tooltip-star:hover { color: #ffaa00; }
    #c42-tooltip-star.active { color: #ffaa00; }
    .c42-seat-img { cursor: pointer; }

    #c42-search {
      width: 100%; box-sizing: border-box; margin-bottom: 10px;
      background: #2a2a2a; border: 1px solid #444; color: #ccc;
      border-radius: 6px; padding: 6px 10px; font-size: 14px;
      font-family: Helvetica, Arial, sans-serif; outline: none;
    }
    #c42-search:focus { border-color: #00babc; }
    #c42-search::placeholder { color: #555; }
    .c42-seat-found {
      stroke: #4fc3f7 !important; stroke-width: 2 !important;
    }
    .c42-seat-friend {
      stroke: #ffaa00 !important; stroke-width: 2.5 !important;
    }
    @keyframes c42-bounce {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-4px); }
    }
    .c42-search-arrow {
      fill: #4fc3f7; text-anchor: middle; font-size: 12px;
      font-family: Arial, sans-serif; pointer-events: none;
      animation: c42-bounce 0.7s ease-in-out infinite;
    }

    #c42-legend {
      display: flex; gap: 16px; margin-bottom: 10px;
      font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #666;
    }
    .c42-leg { display: flex; align-items: center; gap: 6px; }
    .c42-dot { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #555; }
  `;
  document.head.appendChild(style);

  /* ── SVG: c1 ── */
  const svgC1 = `
<svg id="c42-svg-c1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" style="display:block;width:min(2400px,95vw);height:auto">
  <rect width="800" height="800" fill="#1a1a1a" rx="10"/>
  <!-- R2 -->
  <rect id="c1r2s6" height="20" width="16" y="276" x="621" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="624.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r2s5" height="20" width="16" y="292" x="637" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="640.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r2s4" height="20" width="16" y="276" x="653" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="656.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r2s3" height="20" width="16" y="292" x="669" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="672.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r2s2" height="20" width="16" y="276" x="685" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="688.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r2s1" height="20" width="16" y="292" x="701" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="704.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="717" y="302" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R2</text>
  <!-- R1 -->
  <rect id="c1r1s6" height="20" width="16" y="336" x="621" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="624.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r1s5" height="20" width="16" y="352" x="637" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="640.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r1s4" height="20" width="16" y="336" x="653" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="656.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r1s3" height="20" width="16" y="352" x="669" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="672.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r1s2" height="20" width="16" y="336" x="685" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="688.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r1s1" height="20" width="16" y="352" x="701" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="704.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="717" y="362" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R1</text>
  <!-- R4 -->
  <rect id="c1r4s8" height="20" width="16" y="276" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r4s7" height="20" width="16" y="292" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r4s6" height="20" width="16" y="276" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r4s5" height="20" width="16" y="292" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r4s4" height="20" width="16" y="276" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r4s3" height="20" width="16" y="292" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r4s2" height="20" width="16" y="276" x="522" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="308" x="525.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r4s1" height="20" width="16" y="292" x="538" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="324" x="541.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="554" y="302" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R4</text>
  <!-- R3 -->
  <rect id="c1r3s8" height="20" width="16" y="336" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r3s7" height="20" width="16" y="352" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r3s6" height="20" width="16" y="336" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r3s5" height="20" width="16" y="352" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r3s4" height="20" width="16" y="336" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r3s3" height="20" width="16" y="352" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r3s2" height="20" width="16" y="336" x="522" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="368" x="525.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r3s1" height="20" width="16" y="352" x="538" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="384" x="541.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="554" y="362" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R3</text>
  <!-- R8 -->
  <rect id="c1r8s6" height="20" width="16" y="34" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r8s5" height="20" width="16" y="50" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r8s4" height="20" width="16" y="34" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r8s3" height="20" width="16" y="50" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r8s2" height="20" width="16" y="34" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r8s1" height="20" width="16" y="50" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="522" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R8</text>
  <!-- R7 -->
  <rect id="c1r7s6" height="20" width="16" y="94" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r7s5" height="20" width="16" y="110" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r7s4" height="20" width="16" y="94" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r7s3" height="20" width="16" y="110" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r7s2" height="20" width="16" y="94" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r7s1" height="20" width="16" y="110" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="522" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R7</text>
  <!-- R6 -->
  <rect id="c1r6s6" height="20" width="16" y="154" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r6s5" height="20" width="16" y="170" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r6s4" height="20" width="16" y="154" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r6s3" height="20" width="16" y="170" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r6s2" height="20" width="16" y="154" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r6s1" height="20" width="16" y="170" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="522" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R6</text>
  <!-- R5 -->
  <rect id="c1r5s6" height="20" width="16" y="214" x="426" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="429.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r5s5" height="20" width="16" y="230" x="442" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="445.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r5s4" height="20" width="16" y="214" x="458" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="461.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r5s3" height="20" width="16" y="230" x="474" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="477.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r5s2" height="20" width="16" y="214" x="490" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="493.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r5s1" height="20" width="16" y="230" x="506" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="509.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="522" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R5</text>
  <!-- R12 -->
  <rect id="c1r12s6" height="20" width="16" y="154" x="251" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="254.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r12s5" height="20" width="16" y="170" x="267" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="270.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r12s4" height="20" width="16" y="154" x="283" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="286.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r12s3" height="20" width="16" y="170" x="299" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="302.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r12s2" height="20" width="16" y="154" x="315" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="318.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r12s1" height="20" width="16" y="170" x="331" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="334.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="347" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R12</text>
  <!-- R11 -->
  <rect id="c1r11s6" height="20" width="16" y="214" x="251" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="254.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r11s5" height="20" width="16" y="230" x="267" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="270.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r11s4" height="20" width="16" y="214" x="283" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="286.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r11s3" height="20" width="16" y="230" x="299" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="302.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r11s2" height="20" width="16" y="214" x="315" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="318.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r11s1" height="20" width="16" y="230" x="331" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="334.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="347" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R11</text>
  <!-- R10 -->
  <rect id="c1r10s6" height="20" width="16" y="274" x="251" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="254.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r10s5" height="20" width="16" y="290" x="267" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="270.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r10s4" height="20" width="16" y="274" x="283" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="286.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r10s3" height="20" width="16" y="290" x="299" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="302.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r10s2" height="20" width="16" y="274" x="315" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="318.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r10s1" height="20" width="16" y="290" x="331" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="334.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="347" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R10</text>
  <!-- R9 -->
  <rect id="c1r9s6" height="20" width="16" y="334" x="251" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="254.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r9s5" height="20" width="16" y="350" x="267" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="270.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r9s4" height="20" width="16" y="334" x="283" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="286.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r9s3" height="20" width="16" y="350" x="299" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="302.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r9s2" height="20" width="16" y="334" x="315" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="318.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r9s1" height="20" width="16" y="350" x="331" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="334.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="347" y="360" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R9</text>
  <!-- R19 -->
  <rect id="c1r19s4" height="20" width="16" y="394" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="426" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r19s3" height="20" width="16" y="410" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="442" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r19s2" height="20" width="16" y="394" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="426" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r19s1" height="20" width="16" y="410" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="442" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="420" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R19</text>
  <!-- R18 -->
  <rect id="c1r18s4" height="20" width="16" y="454" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="486" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r18s3" height="20" width="16" y="470" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="502" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r18s2" height="20" width="16" y="454" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="486" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r18s1" height="20" width="16" y="470" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="502" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="480" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R18</text>
  <!-- R17 -->
  <rect id="c1r17s4" height="20" width="16" y="514" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="546" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r17s3" height="20" width="16" y="530" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="562" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r17s2" height="20" width="16" y="514" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="546" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r17s1" height="20" width="16" y="530" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="562" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="540" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R17</text>
  <!-- R16 -->
  <rect id="c1r16s4" height="20" width="16" y="574" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="606" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r16s3" height="20" width="16" y="590" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="622" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r16s2" height="20" width="16" y="574" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="606" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r16s1" height="20" width="16" y="590" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="622" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="600" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R16</text>
  <!-- R15 -->
  <rect id="c1r15s4" height="20" width="16" y="634" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="666" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r15s3" height="20" width="16" y="650" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="682" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r15s2" height="20" width="16" y="634" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="666" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r15s1" height="20" width="16" y="650" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="682" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="660" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R15</text>
  <!-- R14 -->
  <rect id="c1r14s4" height="20" width="16" y="694" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="726" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r14s3" height="20" width="16" y="710" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="742" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r14s2" height="20" width="16" y="694" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="726" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r14s1" height="20" width="16" y="710" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="742" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="720" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R14</text>
  <!-- R13 -->
  <rect id="c1r13s4" height="20" width="16" y="754" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="786" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r13s3" height="20" width="16" y="770" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="802" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r13s2" height="20" width="16" y="754" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="786" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r13s1" height="20" width="16" y="770" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="802" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="100" y="780" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R13</text>
  <!-- R23 -->
  <rect id="c1r23s8" height="20" width="16" y="154" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r23s7" height="20" width="16" y="170" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r23s6" height="20" width="16" y="154" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r23s5" height="20" width="16" y="170" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r23s4" height="20" width="16" y="154" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r23s3" height="20" width="16" y="170" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r23s2" height="20" width="16" y="154" x="132" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="135.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r23s1" height="20" width="16" y="170" x="148" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="151.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="164" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R23</text>
  <!-- R22 -->
  <rect id="c1r22s8" height="20" width="16" y="214" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r22s7" height="20" width="16" y="230" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r22s6" height="20" width="16" y="214" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r22s5" height="20" width="16" y="230" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r22s4" height="20" width="16" y="214" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r22s3" height="20" width="16" y="230" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r22s2" height="20" width="16" y="214" x="132" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="135.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r22s1" height="20" width="16" y="230" x="148" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="151.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="164" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R22</text>
  <!-- R21 -->
  <rect id="c1r21s8" height="20" width="16" y="274" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r21s7" height="20" width="16" y="290" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r21s6" height="20" width="16" y="274" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r21s5" height="20" width="16" y="290" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r21s4" height="20" width="16" y="274" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r21s3" height="20" width="16" y="290" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r21s2" height="20" width="16" y="274" x="132" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="135.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r21s1" height="20" width="16" y="290" x="148" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="151.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="164" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R21</text>
  <!-- R20 -->
  <rect id="c1r20s8" height="20" width="16" y="334" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c1r20s7" height="20" width="16" y="350" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c1r20s6" height="20" width="16" y="334" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r20s5" height="20" width="16" y="350" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r20s4" height="20" width="16" y="334" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r20s3" height="20" width="16" y="350" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r20s2" height="20" width="16" y="334" x="132" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="135.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r20s1" height="20" width="16" y="350" x="148" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="151.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="164" y="360" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R20</text>
  <!-- R24 -->
  <rect id="c1r24s6" height="20" width="16" y="99" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="131" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c1r24s5" height="20" width="16" y="115" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="147" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c1r24s4" height="20" width="16" y="99" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="131" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c1r24s3" height="20" width="16" y="115" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="147" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c1r24s2" height="20" width="16" y="99" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="131" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c1r24s1" height="20" width="16" y="115" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="147" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="125" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold">R24</text>
  <text fill="#cccccc" x="250" y="500" font-size="40" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">c1</tspan></text>
</svg>`;

  /* ── SVG: c2 ── */
  const svgC2 = `
<svg id="c42-svg-c2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" style="display:block;width:min(2400px,95vw);height:auto">
  <rect width="800" height="800" fill="#1a1a1a" rx="10"/>
  <!-- R20 -->
  <rect id="c2r20s6" height="20" width="16" y="34" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r20s5" height="20" width="16" y="50" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r20s4" height="20" width="16" y="34" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r20s3" height="20" width="16" y="50" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r20s2" height="20" width="16" y="34" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r20s1" height="20" width="16" y="50" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R20</tspan></text>
  <!-- R19 -->
  <rect id="c2r19s6" height="20" width="16" y="94" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r19s5" height="20" width="16" y="110" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r19s4" height="20" width="16" y="94" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r19s3" height="20" width="16" y="110" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r19s2" height="20" width="16" y="94" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r19s1" height="20" width="16" y="110" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R19</tspan></text>
  <!-- R18 -->
  <rect id="c2r18s6" height="20" width="16" y="154" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r18s5" height="20" width="16" y="170" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r18s4" height="20" width="16" y="154" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r18s3" height="20" width="16" y="170" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r18s2" height="20" width="16" y="154" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r18s1" height="20" width="16" y="170" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R18</tspan></text>
  <!-- R17 -->
  <rect id="c2r17s6" height="20" width="16" y="214" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r17s5" height="20" width="16" y="230" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r17s4" height="20" width="16" y="214" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r17s3" height="20" width="16" y="230" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r17s2" height="20" width="16" y="214" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r17s1" height="20" width="16" y="230" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R17</tspan></text>
  <!-- R16 -->
  <rect id="c2r16s6" height="20" width="16" y="274" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r16s5" height="20" width="16" y="290" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r16s4" height="20" width="16" y="274" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r16s3" height="20" width="16" y="290" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r16s2" height="20" width="16" y="274" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r16s1" height="20" width="16" y="290" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R16</tspan></text>
  <!-- R15 -->
  <rect id="c2r15s4" height="20" width="16" y="334" x="18" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="21.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r15s3" height="20" width="16" y="350" x="34" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="37.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r15s2" height="20" width="16" y="334" x="50" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="366" x="53.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r15s1" height="20" width="16" y="350" x="66" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="382" x="69.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="82" y="360" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R15</tspan></text>
  <!-- R14 -->
  <rect id="c2r14s4" height="20" width="16" y="394" x="18" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="426" x="21.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r14s3" height="20" width="16" y="410" x="34" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="442" x="37.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r14s2" height="20" width="16" y="394" x="50" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="426" x="53.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r14s1" height="20" width="16" y="410" x="66" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="442" x="69.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="82" y="420" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R14</tspan></text>
  <!-- R13 -->
  <rect id="c2r13s4" height="20" width="16" y="454" x="18" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="486" x="21.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r13s3" height="20" width="16" y="470" x="34" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="502" x="37.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r13s2" height="20" width="16" y="454" x="50" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="486" x="53.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r13s1" height="20" width="16" y="470" x="66" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="502" x="69.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="82" y="480" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R13</tspan></text>
  <!-- R12 -->
  <rect id="c2r12s4" height="20" width="16" y="514" x="18" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="546" x="21.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r12s3" height="20" width="16" y="530" x="34" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="562" x="37.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r12s2" height="20" width="16" y="514" x="50" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="546" x="53.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r12s1" height="20" width="16" y="530" x="66" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="562" x="69.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="82" y="540" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R12</tspan></text>
  <!-- R11 -->
  <rect id="c2r11s4" height="20" width="16" y="574" x="18" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="606" x="21.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r11s3" height="20" width="16" y="590" x="34" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="622" x="37.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r11s2" height="20" width="16" y="574" x="50" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="606" x="53.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r11s1" height="20" width="16" y="590" x="66" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="622" x="69.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="82" y="600" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R11</tspan></text>
  <!-- R10 -->
  <rect id="c2r10s8" height="20" width="16" y="34" x="216" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="219.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r10s7" height="20" width="16" y="50" x="232" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="235.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r10s6" height="20" width="16" y="34" x="248" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="251.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r10s5" height="20" width="16" y="50" x="264" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="267.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r10s4" height="20" width="16" y="34" x="280" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="283.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r10s3" height="20" width="16" y="50" x="296" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="299.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r10s2" height="20" width="16" y="34" x="312" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="315.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r10s1" height="20" width="16" y="50" x="328" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="331.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="344" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R10</tspan></text>
  <!-- R9 -->
  <rect id="c2r9s8" height="20" width="16" y="94" x="216" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="219.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r9s7" height="20" width="16" y="110" x="232" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="235.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r9s6" height="20" width="16" y="94" x="248" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="251.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r9s5" height="20" width="16" y="110" x="264" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="267.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r9s4" height="20" width="16" y="94" x="280" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="283.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r9s3" height="20" width="16" y="110" x="296" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="299.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r9s2" height="20" width="16" y="94" x="312" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="315.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r9s1" height="20" width="16" y="110" x="328" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="331.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="344" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R9</tspan></text>
  <!-- R8 -->
  <rect id="c2r8s8" height="20" width="16" y="154" x="216" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="219.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r8s7" height="20" width="16" y="170" x="232" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="235.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r8s6" height="20" width="16" y="154" x="248" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="251.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r8s5" height="20" width="16" y="170" x="264" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="267.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r8s4" height="20" width="16" y="154" x="280" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="283.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r8s3" height="20" width="16" y="170" x="296" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="299.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r8s2" height="20" width="16" y="154" x="312" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="315.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r8s1" height="20" width="16" y="170" x="328" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="331.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="344" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R8</tspan></text>
  <!-- R7 -->
  <rect id="c2r7s8" height="20" width="16" y="214" x="216" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="219.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r7s7" height="20" width="16" y="230" x="232" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="235.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r7s6" height="20" width="16" y="214" x="248" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="251.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r7s5" height="20" width="16" y="230" x="264" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="267.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r7s4" height="20" width="16" y="214" x="280" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="283.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r7s3" height="20" width="16" y="230" x="296" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="299.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r7s2" height="20" width="16" y="214" x="312" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="315.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r7s1" height="20" width="16" y="230" x="328" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="331.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="344" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R7</tspan></text>
  <!-- R6 -->
  <rect id="c2r6s8" height="20" width="16" y="274" x="216" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="219.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r6s7" height="20" width="16" y="290" x="232" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="235.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r6s6" height="20" width="16" y="274" x="248" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="251.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r6s5" height="20" width="16" y="290" x="264" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="267.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r6s4" height="20" width="16" y="274" x="280" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="283.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r6s3" height="20" width="16" y="290" x="296" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="299.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r6s2" height="20" width="16" y="274" x="312" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="315.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r6s1" height="20" width="16" y="290" x="328" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="331.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="344" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R6</tspan></text>
  <!-- R5 -->
  <rect id="c2r5s6" height="20" width="16" y="154" x="416" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="419.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r5s5" height="20" width="16" y="170" x="432" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="435.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r5s4" height="20" width="16" y="154" x="448" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="451.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r5s3" height="20" width="16" y="170" x="464" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="467.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r5s2" height="20" width="16" y="154" x="480" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="483.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r5s1" height="20" width="16" y="170" x="496" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="499.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="512" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R5</tspan></text>
  <!-- R4 -->
  <rect id="c2r4s6" height="20" width="16" y="214" x="416" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="419.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r4s5" height="20" width="16" y="230" x="432" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="435.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r4s4" height="20" width="16" y="214" x="448" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="451.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r4s3" height="20" width="16" y="230" x="464" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="467.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r4s2" height="20" width="16" y="214" x="480" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="483.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r4s1" height="20" width="16" y="230" x="496" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="499.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="512" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R4</tspan></text>
  <!-- R3 -->
  <rect id="c2r3s8" height="20" width="16" y="274" x="416" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="419.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">8</text>
  <rect id="c2r3s7" height="20" width="16" y="290" x="432" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="435.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">7</text>
  <rect id="c2r3s6" height="20" width="16" y="274" x="448" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="451.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r3s5" height="20" width="16" y="290" x="464" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="467.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r3s4" height="20" width="16" y="274" x="480" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="483.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r3s3" height="20" width="16" y="290" x="496" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="499.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r3s2" height="20" width="16" y="274" x="512" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="515.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r3s1" height="20" width="16" y="290" x="528" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="531.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="544" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R3</tspan></text>
  <!-- R2 -->
  <rect id="c2r2s6" height="20" width="16" y="244" x="616" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="276" x="619.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c2r2s5" height="20" width="16" y="260" x="632" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="292" x="635.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c2r2s4" height="20" width="16" y="244" x="648" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="276" x="651.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r2s3" height="20" width="16" y="260" x="664" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="292" x="667.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r2s2" height="20" width="16" y="244" x="680" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="276" x="683.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r2s1" height="20" width="16" y="260" x="696" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="292" x="699.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="712" y="270" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R2</tspan></text>
  <!-- R1 -->
  <rect id="c2r1s4" height="20" width="16" y="304" x="616" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="336" x="619.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c2r1s3" height="20" width="16" y="320" x="632" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="352" x="635.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c2r1s2" height="20" width="16" y="304" x="648" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="336" x="651.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c2r1s1" height="20" width="16" y="320" x="664" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="352" x="667.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="680" y="330" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R1</tspan></text>
  <text fill="#cccccc" x="250" y="500" font-size="40" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">c2</tspan></text>
</svg>`;

  /* ── SVG: c3 ── */
  const svgC3 = `
<svg id="c42-svg-c3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" style="display:block;width:min(2400px,95vw);height:auto">
  <rect width="800" height="800" fill="#1a1a1a" rx="10"/>
  <!-- R5 -->
  <rect id="c3r5s6" height="20" width="16" y="34" x="546" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="549.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r5s5" height="20" width="16" y="50" x="562" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="565.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r5s4" height="20" width="16" y="34" x="578" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="581.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r5s3" height="20" width="16" y="50" x="594" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="597.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r5s2" height="20" width="16" y="34" x="610" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="613.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r5s1" height="20" width="16" y="50" x="626" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="629.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="642" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R5</tspan></text>
  <!-- R4 -->
  <rect id="c3r4s6" height="20" width="16" y="94" x="546" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="549.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r4s5" height="20" width="16" y="110" x="562" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="565.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r4s4" height="20" width="16" y="94" x="578" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="581.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r4s3" height="20" width="16" y="110" x="594" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="597.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r4s2" height="20" width="16" y="94" x="610" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="613.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r4s1" height="20" width="16" y="110" x="626" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="629.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="642" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R4</tspan></text>
  <!-- R3 -->
  <rect id="c3r3s6" height="20" width="16" y="154" x="546" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="549.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r3s5" height="20" width="16" y="170" x="562" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="565.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r3s4" height="20" width="16" y="154" x="578" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="581.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r3s3" height="20" width="16" y="170" x="594" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="597.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r3s2" height="20" width="16" y="154" x="610" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="613.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r3s1" height="20" width="16" y="170" x="626" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="629.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="642" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R3</tspan></text>
  <!-- R2 -->
  <rect id="c3r2s6" height="20" width="16" y="214" x="546" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="549.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r2s5" height="20" width="16" y="230" x="562" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="565.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r2s4" height="20" width="16" y="214" x="578" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="581.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r2s3" height="20" width="16" y="230" x="594" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="597.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r2s2" height="20" width="16" y="214" x="610" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="613.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r2s1" height="20" width="16" y="230" x="626" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="629.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="642" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R2</tspan></text>
  <!-- R1 -->
  <rect id="c3r1s6" height="20" width="16" y="274" x="546" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="549.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r1s5" height="20" width="16" y="290" x="562" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="565.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r1s4" height="20" width="16" y="274" x="578" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="581.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r1s3" height="20" width="16" y="290" x="594" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="597.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r1s2" height="20" width="16" y="274" x="610" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="613.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r1s1" height="20" width="16" y="290" x="626" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="629.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="642" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R1</tspan></text>
  <!-- R10 -->
  <rect id="c3r10s6" height="20" width="16" y="34" x="376" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="379.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r10s5" height="20" width="16" y="50" x="392" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="395.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r10s4" height="20" width="16" y="34" x="408" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="411.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r10s3" height="20" width="16" y="50" x="424" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="427.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r10s2" height="20" width="16" y="34" x="440" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="443.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r10s1" height="20" width="16" y="50" x="456" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="459.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="472" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R10</tspan></text>
  <!-- R9 -->
  <rect id="c3r9s6" height="20" width="16" y="94" x="376" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="379.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r9s5" height="20" width="16" y="110" x="392" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="395.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r9s4" height="20" width="16" y="94" x="408" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="411.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r9s3" height="20" width="16" y="110" x="424" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="427.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r9s2" height="20" width="16" y="94" x="440" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="443.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r9s1" height="20" width="16" y="110" x="456" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="459.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="472" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R9</tspan></text>
  <!-- R8 -->
  <rect id="c3r8s6" height="20" width="16" y="154" x="376" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="379.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r8s5" height="20" width="16" y="170" x="392" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="395.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r8s4" height="20" width="16" y="154" x="408" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="411.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r8s3" height="20" width="16" y="170" x="424" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="427.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r8s2" height="20" width="16" y="154" x="440" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="443.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r8s1" height="20" width="16" y="170" x="456" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="459.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="472" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R8</tspan></text>
  <!-- R7 -->
  <rect id="c3r7s6" height="20" width="16" y="214" x="376" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="379.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r7s5" height="20" width="16" y="230" x="392" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="395.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r7s4" height="20" width="16" y="214" x="408" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="411.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r7s3" height="20" width="16" y="230" x="424" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="427.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r7s2" height="20" width="16" y="214" x="440" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="443.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r7s1" height="20" width="16" y="230" x="456" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="459.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="472" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R7</tspan></text>
  <!-- R6 -->
  <rect id="c3r6s6" height="20" width="16" y="274" x="376" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="379.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r6s5" height="20" width="16" y="290" x="392" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="395.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r6s4" height="20" width="16" y="274" x="408" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="411.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r6s3" height="20" width="16" y="290" x="424" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="427.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r6s2" height="20" width="16" y="274" x="440" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="443.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r6s1" height="20" width="16" y="290" x="456" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="459.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="472" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R6</tspan></text>
  <!-- R15 -->
  <rect id="c3r15s6" height="20" width="16" y="34" x="206" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="209.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r15s5" height="20" width="16" y="50" x="222" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="225.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r15s4" height="20" width="16" y="34" x="238" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="241.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r15s3" height="20" width="16" y="50" x="254" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="257.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r15s2" height="20" width="16" y="34" x="270" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="273.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r15s1" height="20" width="16" y="50" x="286" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="289.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="302" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R15</tspan></text>
  <!-- R14 -->
  <rect id="c3r14s6" height="20" width="16" y="94" x="206" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="209.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r14s5" height="20" width="16" y="110" x="222" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="225.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r14s4" height="20" width="16" y="94" x="238" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="241.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r14s3" height="20" width="16" y="110" x="254" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="257.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r14s2" height="20" width="16" y="94" x="270" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="273.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r14s1" height="20" width="16" y="110" x="286" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="289.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="302" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R14</tspan></text>
  <!-- R13 -->
  <rect id="c3r13s6" height="20" width="16" y="154" x="206" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="209.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r13s5" height="20" width="16" y="170" x="222" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="225.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r13s4" height="20" width="16" y="154" x="238" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="241.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r13s3" height="20" width="16" y="170" x="254" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="257.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r13s2" height="20" width="16" y="154" x="270" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="273.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r13s1" height="20" width="16" y="170" x="286" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="289.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="302" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R13</tspan></text>
  <!-- R12 -->
  <rect id="c3r12s6" height="20" width="16" y="214" x="206" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="209.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r12s5" height="20" width="16" y="230" x="222" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="225.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r12s4" height="20" width="16" y="214" x="238" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="241.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r12s3" height="20" width="16" y="230" x="254" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="257.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r12s2" height="20" width="16" y="214" x="270" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="273.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r12s1" height="20" width="16" y="230" x="286" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="289.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="302" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R12</tspan></text>
  <!-- R11 -->
  <rect id="c3r11s6" height="20" width="16" y="274" x="206" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="209.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r11s5" height="20" width="16" y="290" x="222" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="225.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r11s4" height="20" width="16" y="274" x="238" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="241.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r11s3" height="20" width="16" y="290" x="254" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="257.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r11s2" height="20" width="16" y="274" x="270" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="273.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r11s1" height="20" width="16" y="290" x="286" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="289.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="302" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R11</tspan></text>
  <!-- R20 -->
  <rect id="c3r20s6" height="20" width="16" y="34" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r20s5" height="20" width="16" y="50" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r20s4" height="20" width="16" y="34" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r20s3" height="20" width="16" y="50" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r20s2" height="20" width="16" y="34" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="66" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r20s1" height="20" width="16" y="50" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="82" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="60" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R20</tspan></text>
  <!-- R19 -->
  <rect id="c3r19s6" height="20" width="16" y="94" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r19s5" height="20" width="16" y="110" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r19s4" height="20" width="16" y="94" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r19s3" height="20" width="16" y="110" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r19s2" height="20" width="16" y="94" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="126" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r19s1" height="20" width="16" y="110" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="142" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="120" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R19</tspan></text>
  <!-- R18 -->
  <rect id="c3r18s6" height="20" width="16" y="154" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r18s5" height="20" width="16" y="170" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r18s4" height="20" width="16" y="154" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r18s3" height="20" width="16" y="170" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r18s2" height="20" width="16" y="154" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="186" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r18s1" height="20" width="16" y="170" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="202" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="180" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R18</tspan></text>
  <!-- R17 -->
  <rect id="c3r17s6" height="20" width="16" y="214" x="36" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="39.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">6</text>
  <rect id="c3r17s5" height="20" width="16" y="230" x="52" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="55.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">5</text>
  <rect id="c3r17s4" height="20" width="16" y="214" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r17s3" height="20" width="16" y="230" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r17s2" height="20" width="16" y="214" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="246" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r17s1" height="20" width="16" y="230" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="262" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="240" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R17</tspan></text>
  <!-- R16 -->
  <rect id="c3r16s4" height="20" width="16" y="274" x="68" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="71.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">4</text>
  <rect id="c3r16s3" height="20" width="16" y="290" x="84" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="87.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">3</text>
  <rect id="c3r16s2" height="20" width="16" y="274" x="100" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="306" x="103.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">2</text>
  <rect id="c3r16s1" height="20" width="16" y="290" x="116" stroke="#7f7f7f" fill="${EMPTY}"/>
  <text y="322" x="119.2" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#b2b2b2">1</text>
  <text fill="#cccccc" x="132" y="300" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">R16</tspan></text>
  <text fill="#cccccc" x="250" y="500" font-size="40" font-family="Helvetica,Arial,sans-serif" font-weight="bold"><tspan dx="5">c3</tspan></text>
</svg>`;

  /* ── DOM 생성 ── */
  const overlay = document.createElement('div');
  overlay.id = 'c42-overlay';
  overlay.innerHTML = `
    <div id="c42-panel">
      <button id="c42-close">✕</button>
      <div id="c42-header">
        <h2>42 경산 클러스터 배치도</h2>
      </div>
      <div id="c42-tabs">
        <div id="c42-tab-left">
          <button class="c42-tab active" data-cluster="c1">c1</button>
          <button class="c42-tab" data-cluster="c2">c2</button>
          <button class="c42-tab" data-cluster="c3">c3</button>
        </div>
        <div id="c42-default-bar">
          기본
          <button class="c42-default-btn active" data-cluster="c1">c1</button>
          <button class="c42-default-btn" data-cluster="c2">c2</button>
          <button class="c42-default-btn" data-cluster="c3">c3</button>
        </div>
      </div>
      <div id="c42-status">불러오는 중…</div>
      <input id="c42-search" type="text" placeholder="동료 검색…" autocomplete="off" spellcheck="false">
      <div id="c42-legend">
        <div class="c42-leg"><div class="c42-dot" style="background:#e5e5e5"></div>빈 자리</div>
        <div class="c42-leg"><div class="c42-dot" style="background:#00babc;border-color:#009fa1"></div>사용 중</div>
      </div>
      <div class="c42-svg-wrap active" data-cluster="c1">${svgC1}</div>
      <div class="c42-svg-wrap" data-cluster="c2">${svgC2}</div>
      <div class="c42-svg-wrap" data-cluster="c3">${svgC3}</div>
    </div>`;
  document.body.appendChild(overlay);

  const btn = document.createElement('button');
  btn.id = 'c42-btn';
  btn.title = '클러스터 지도 열기';
  btn.textContent = '🗺';
  document.body.appendChild(btn);

  const tooltip = document.createElement('div');
  tooltip.id = 'c42-tooltip';
  document.body.appendChild(tooltip);

  let tipHideTimer = null;

  function showTip(login, imageUrl) {
    clearTimeout(tipHideTimer);
    const isFriend = friends.has(login);
    tooltip.innerHTML = imageUrl
      ? `<img src="${imageUrl}"><span>${login}</span>`
      : `<span>${login}</span>`;
    const star = document.createElement('button');
    star.id = 'c42-tooltip-star';
    star.textContent = isFriend ? '★' : '☆';
    if (isFriend) star.classList.add('active');
    star.addEventListener('click', e => {
      e.stopPropagation();
      toggleFriend(login);
      const now = friends.has(login);
      star.textContent = now ? '★' : '☆';
      star.classList.toggle('active', now);
    });
    tooltip.appendChild(star);
    tooltip.style.display = 'block';
  }

  function hideTip() {
    tipHideTimer = setTimeout(() => { tooltip.style.display = 'none'; }, 150);
  }

  tooltip.addEventListener('mouseenter', () => clearTimeout(tipHideTimer));
  tooltip.addEventListener('mouseleave', hideTip);

  document.addEventListener('mousemove', e => {
    if (tooltip.style.display !== 'block' || tooltip.matches(':hover')) return;
    let x = e.clientX + 12, y = e.clientY - 28;
    if (x + 160 > window.innerWidth) x = e.clientX - 160;
    if (y < 4) y = e.clientY + 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  });

  /* ── 탭 전환 ── */
  function switchTab(cluster) {
    overlay.querySelectorAll('.c42-tab').forEach(t => t.classList.toggle('active', t.dataset.cluster === cluster));
    overlay.querySelectorAll('.c42-svg-wrap').forEach(w => w.classList.toggle('active', w.dataset.cluster === cluster));
    hideTip();
  }

  overlay.querySelectorAll('.c42-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.cluster));
  });

  /* ── 기본 클러스터 설정 ── */
  function updateDefaultBtns(cluster) {
    overlay.querySelectorAll('.c42-default-btn').forEach(b => b.classList.toggle('active', b.dataset.cluster === cluster));
  }

  overlay.querySelectorAll('.c42-default-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('c42-default-cluster', btn.dataset.cluster);
      updateDefaultBtns(btn.dataset.cluster);
    });
  });

  const savedCluster = localStorage.getItem('c42-default-cluster') || 'c1';
  updateDefaultBtns(savedCluster);
  if (savedCluster !== 'c1') switchTab(savedCluster);

  /* ── SVG 이미지 주입 / 제거 ── */
  function clearSeatImages() {
    overlay.querySelectorAll('.c42-seat-img').forEach(el => el.remove());
    overlay.querySelectorAll('[id^="c42-clip-"]').forEach(el => el.remove());
  }

  function injectImage(svg, rect, login, imageUrl) {
    const x = +rect.getAttribute('x');
    const y = +rect.getAttribute('y');
    const w = +rect.getAttribute('width');
    const h = +rect.getAttribute('height');
    const r = Math.min(w, h) / 2 - 0.5;

    let defs = svg.querySelector('defs');
    if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.prepend(defs); }

    const clipId = `c42-clip-${rect.id}`;
    const clip = document.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', clipId);
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', x + w / 2);
    circle.setAttribute('cy', y + h / 2);
    circle.setAttribute('r', r);
    clip.appendChild(circle);
    defs.appendChild(clip);

    const img = document.createElementNS(NS, 'image');
    img.setAttribute('href', imageUrl);
    img.setAttribute('x', x);
    img.setAttribute('y', y);
    img.setAttribute('width', w);
    img.setAttribute('height', h);
    img.setAttribute('clip-path', `url(#${clipId})`);
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    img.classList.add('c42-seat-img');
    img.addEventListener('mouseenter', () => showTip(login, imageUrl));
    img.addEventListener('mouseleave', hideTip);
    img.addEventListener('click', () => {
      window.open(`https://profile-v3.intra.42.fr/users/${login}`, '_blank');
    });
    rect.after(img);
  }

  /* ── 데이터 불러오기 ── */
  function loadCluster() {
    const status = document.getElementById('c42-status');
    status.textContent = '불러오는 중…';

    clearSeatImages();
    seatMap.clear();
    overlay.querySelectorAll('rect[id^="c1r"], rect[id^="c2r"], rect[id^="c3r"]').forEach(r => r.setAttribute('fill', EMPTY));

    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://meta.intra.42.fr/clusters.json',
      onload(res) {
        try {
          const data = JSON.parse(res.responseText);
          const counts = { c1: 0, c2: 0, c3: 0 };
          data.forEach(({ host, login, cdn_uri }) => {
            const rect = overlay.querySelector(`rect#${host}`);
            if (!rect) return;
            const cluster = host.startsWith('c1') ? 'c1' : host.startsWith('c2') ? 'c2' : 'c3';
            rect.setAttribute('fill', OCCUPIED);
            seatMap.set(login, { rect, cluster });
            if (cdn_uri) {
              const svg = overlay.querySelector(`#c42-svg-${cluster}`);
              injectImage(svg, rect, login, cdn_uri);
            }
            counts[cluster]++;
          });
          const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          status.innerHTML = `c1: ${counts.c1}명 &nbsp;·&nbsp; c2: ${counts.c2}명 &nbsp;·&nbsp; c3: ${counts.c3}명 &nbsp;·&nbsp; ${now} <button id="c42-refresh">새로고침</button>`;
          document.getElementById('c42-refresh').addEventListener('click', loadCluster);
          applySearch();
          applyFriends();
        } catch (e) {
          status.textContent = '파싱 오류: ' + e.message;
        }
      },
      onerror() {
        status.textContent = '불러오기 실패 (로그인 상태 확인)';
      }
    });
  }

  /* ── 버튼 이벤트 ── */
  btn.addEventListener('click', () => {
    switchTab(localStorage.getItem('c42-default-cluster') || 'c1');
    overlay.classList.add('open');
    loadCluster();
  });

  function closePanel() {
    overlay.classList.remove('open');
    clearTimeout(tipHideTimer);
    tooltip.style.display = 'none';
    searchInput.value = '';
    overlay.querySelectorAll('.c42-seat-found').forEach(el => el.classList.remove('c42-seat-found'));
    overlay.querySelectorAll('.c42-search-arrow').forEach(el => el.remove());
  }

  document.getElementById('c42-close').addEventListener('click', closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

})();
