/* Pink sky: WebGL1 fbm cloud layers, seeded wandering wind, half-res, paused off-screen. */
(function () {
  'use strict';
  var cv = document.querySelector('canvas[data-sky]');
  if (!cv) return;
  var hero = cv.parentElement;

  function fallback() {
    if (cv.parentNode) cv.style.display = 'none';
    if (hero.querySelector('.sky-fallback')) return;
    var d = document.createElement('div');
    d.className = 'sky-fallback';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<i></i><i></i><i></i>';
    hero.insertBefore(d, cv.nextSibling);
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vid = hero.querySelector('.sky-video');
  if (reduce) {
    if (vid) { try { vid.removeAttribute('autoplay'); vid.pause(); vid.load(); } catch (e) {} }
    fallback(); return;
  }
  if (window.matchMedia && matchMedia('(max-width: 767px)').matches) return; /* phones use the video */

  var gl = null;
  try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) { fallback(); return; }

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
'precision mediump float;',
'uniform vec2 uRes;uniform float uT;uniform vec2 uO0;uniform vec2 uO1;uniform vec2 uO2;',
'float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
' return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),',
'            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}',
'float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.07+vec3(5.3,1.7,2.9);a*=.5;}return s;}',
/* billowy density: warped fbm, z drift makes clouds grow and melt */
'float dens(vec2 p,float z){vec2 w=vec2(n(vec3(p*.7,z)),n(vec3(p*.7+9.,z+3.)));p+=(w-.5)*.9;return fbm(vec3(p,z));}',
'float dd(vec2 p,float z){float d=dens(p,z);return d+.11*(n(vec3(p*5.3,z*2.))-.5)+.07*(1.-abs(n(vec3(p*3.1,z*1.5))*2.-1.))+.035*(n(vec3(p*11.,z*3.))-.5);}',
'void main(){',
' vec2 fc=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;',
' float hy=.80;float s=hy-fc.y;',
' vec3 hor=vec3(.973,.851,.812),upper=vec3(.93,.72,.72),coral=vec3(.945,.60,.61),coral2=vec3(.968,.70,.66),lav=vec3(.54,.44,.64),mauve=vec3(.40,.32,.50),glow=vec3(1.,.89,.78);',
' float br=.5+.5*sin(uT*.11);coral=mix(coral,coral2,br*.7);',
/* one continuous sky: horizon colour is also the fog colour, no seam */
' float sk=smoothstep(hy-.02,1.,fc.y);',
' vec3 sky=mix(hor,upper,pow(sk,.8));',
' vec2 sp=vec2((fc.x-.64)*asp,fc.y-hy-.01);',
' float sd=length(sp*vec2(1.,2.2));',
' sky+=glow*(exp(-sd*5.)*.22+exp(-sd*16.)*.16);',
' float ang=atan(sp.x,sp.y+.12);',
' float ray=pow(max(0.,n(vec3(ang*7.,uT*.05,1.))*1.4-.35),1.5)*exp(-length(sp)*2.4);',
' sky+=glow*ray*.14;',
' vec2 g=floor(vec2(fc.x*asp,fc.y)*vec2(46.,46.));float r=hh(g);',
' vec2 cp=fract(vec2(fc.x*asp,fc.y)*46.)-.5-(vec2(hh(g+3.),hh(g+7.))-.5)*.5;',
' float st=step(.93,r)*smoothstep(.12,.0,length(cp))*(.5+.5*sin(uT*(.35+r*1.1)+r*60.));',
' sky+=vec3(1.,.97,.9)*st*smoothstep(.75,.97,fc.y)*.9;',
' vec3 col=sky;',
' if(s>0.){',
'  float d=1./(s*.9+.55);',
'  float fog=smoothstep(.16,.0,s);fog*=fog;',
'  vec3 floorC=mix(lav,mauve,smoothstep(.45,.0,fc.y));',
/* far deck */
'  vec2 pF=vec2((fc.x-.5)*asp*d*1.0,-d*1.2+s*1.5+uT*.012)+uO0*.8;',
'  float dF=dd(pF,uT*.012);float cF=smoothstep(.49,.515,dF);',
'  float lF=clamp((dF-dd(pF+vec2(.0,-.16),uT*.012))*8.+.12+(dF-.5)*1.5,0.,1.);',
'  vec3 c=mix(floorC,mix(lav,coral,lF),cF);',
/* near deck: crisp billows, lit tops toward the sun, lavender undersides */
'  vec2 pN=vec2((fc.x-.5)*asp*d*1.8,-d*1.7+s*2.2+uT*.03)+uO1*1.6+vec2(uO2.x*.4,0.);',
'  float dN=dd(pN,uT*.02+7.);float cN=smoothstep(.485,.51,dN);',
'  float lN=clamp((dN-dd(pN+vec2(.0,-.09),uT*.02+7.))*9.+.15+(dN-.5)*2.2,0.,1.);',
'  vec3 top=mix(coral,mix(coral2,hor,.45),smoothstep(.7,1.,lN));',
'  vec3 cn=mix(lav,top,lN);',
'  c=mix(c,cn,cN);',
'  c=mix(c,hor,fog);',
'  c=mix(c,mauve*vec3(1.0,.96,1.0),smoothstep(.22,.0,fc.y)*.45);',
'  col=c;}',
' gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      window.__skyLog = gl.getShaderInfoLog(s);
      if (window.console) console.error('sky shader:', window.__skyLog);
      return null;
    }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback(); return; }
  var pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fallback(); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uT', 'uO0', 'uO1', 'uO2'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  /* seeded random */
  var seed = (Math.random() * 4294967296) >>> 0;
  function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  /* each layer: own heading that wanders via incommensurate slow sines, own speed, own phase */
  var layers = [0, 1, 2].map(function (i) {
    return {
      base: rnd() * 6.283, speed: [0.006, 0.011, 0.019][i] * (0.8 + rnd() * 0.5),
      a1: 0.9 + rnd() * 0.8, w1: 0.011 + rnd() * 0.012, p1: rnd() * 6.283,
      a2: 0.5 + rnd() * 0.6, w2: 0.023 + rnd() * 0.017, p2: rnd() * 6.283,
      x: rnd() * 100, y: rnd() * 100
    };
  });

  var SCALE = 0.5, W = 0, H = 0;
  function resize() {
    var r = cv.getBoundingClientRect();
    var w = Math.max(2, Math.round(r.width * SCALE)), h = Math.max(2, Math.round(r.height * SCALE));
    if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; gl.viewport(0, 0, W, H); }
  }

  var t = rnd() * 200, last = 0, raf = 0, visible = true, running = false;
  var FRAME = 1000 / 30;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    var dt = Math.min((now - (last || now - FRAME)) / 1000, 0.1);
    last = now; t += dt;
    for (var i = 0; i < 3; i++) {
      var L = layers[i];
      var a = L.base + L.a1 * Math.sin(L.w1 * t + L.p1) + L.a2 * Math.sin(L.w2 * t + L.p2);
      L.x += Math.cos(a) * L.speed * dt; L.y += Math.sin(a) * L.speed * dt * 0.6;
    }
    resize();
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uT, t);
    gl.uniform2f(U.uO0, layers[0].x, layers[0].y);
    gl.uniform2f(U.uO1, layers[1].x, layers[1].y);
    gl.uniform2f(U.uO2, layers[2].x, layers[2].y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  resize();
  start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  }
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); fallback(); });
  window.__sky = { gl: gl, canvas: cv };
})();
