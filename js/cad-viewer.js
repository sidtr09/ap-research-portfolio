/**
 * F1TENTH Interactive 3D CAD Viewer — technical-illustration style
 * Ghosted translucent parts + crease lines + screen-space ink silhouettes.
 * Three.js r128. Siddharth Tirumalareddi · AP Research Portfolio
 */
(function () {
  const V3 = THREE.Vector3;
  const INK = 0x1c1c1e;
  const SIGNAL = 0xff4f00;
  const LAYER_LINES = 1;   // crease lines: visible, excluded from the outline pass
  const LAYER_FX = 2;      // contact shadow, scan ring

  /* ---------------- geometry helpers ---------------- */
  function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slotPath(cx, cy, w, h) {
    const r = Math.min(w, h) / 2;
    const p = new THREE.Path();
    const x = cx - w / 2, y = cy - h / 2;
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2, false);
    p.lineTo(x + r, y + h); p.absarc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5, false);
    return p;
  }
  function circlePath(cx, cy, r) {
    const p = new THREE.Path();
    p.absarc(cx, cy, r, 0, Math.PI * 2, true);
    return p;
  }
  function polyShape(pts) {
    const s = new THREE.Shape();
    pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    s.closePath();
    return s;
  }
  function gearShape(rO, rI, teeth, hole) {
    const s = new THREE.Shape();
    const step = (Math.PI * 2) / teeth;
    for (let t = 0; t < teeth; t++) {
      const a = t * step;
      const pts = [[rI, a], [rO, a + step * 0.22], [rO, a + step * 0.5], [rI, a + step * 0.72]];
      pts.forEach(([r, ang], k) => {
        const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
        if (t === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
      });
    }
    s.closePath();
    if (hole) s.holes.push(circlePath(0, 0, hole));
    return s;
  }
  // Flat plate in XZ from a shape drawn in (x, forward) coords; thickness along +y.
  function plateGeo(shape, t) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  // Vertical plate in XY plane; thickness along z.
  function wallGeo(shape, t) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -t / 2);
    return g;
  }
  function helixPoints(r, len, turns, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = t * turns * Math.PI * 2;
      pts.push(new V3(Math.cos(a) * r, t * len - len / 2, Math.sin(a) * r));
    }
    return pts;
  }
  function circlePoints(r, n, axis) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
      pts.push(axis === 'x' ? new V3(0, c, s) : axis === 'z' ? new V3(c, s, 0) : new V3(c, 0, s));
    }
    return pts;
  }
  function alignY(obj, a, b) {
    const dir = new V3().subVectors(b, a);
    obj.position.copy(a).add(b).multiplyScalar(0.5);
    obj.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize());
    return dir.length();
  }

  /* ---------------- outline (silhouette) shader ---------------- */
  const OutlineShader = {
    uniforms: {
      tNormal: { value: null }, tDepth: { value: null },
      texel: { value: new THREE.Vector2() }, near: { value: 0.1 }, far: { value: 60 },
      ink: { value: new THREE.Color(INK) }, strength: { value: 0.92 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tNormal; uniform sampler2D tDepth; uniform vec2 texel;',
      'uniform float near; uniform float far; uniform vec3 ink; uniform float strength;',
      'varying vec2 vUv;',
      'float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }',
      'void main(){',
      '  float d = lin(texture2D(tDepth, vUv).x);',
      '  vec3 n = texture2D(tNormal, vUv).xyz;',
      '  float dd = 0.0; float nd = 0.0;',
      '  vec2 o[4]; o[0] = vec2(texel.x, 0.0); o[1] = vec2(-texel.x, 0.0); o[2] = vec2(0.0, texel.y); o[3] = vec2(0.0, -texel.y);',
      '  for (int i = 0; i < 4; i++) {',
      '    float dn = lin(texture2D(tDepth, vUv + o[i]).x);',
      '    dd = max(dd, abs(dn - d) / min(d, dn));',
      '    nd += distance(texture2D(tNormal, vUv + o[i]).xyz, n);',
      '  }',
      '  float e = max(smoothstep(0.015, 0.05, dd), smoothstep(0.35, 0.75, nd));',
      '  gl_FragColor = vec4(ink, e * strength);',
      '}'
    ].join('\n')
  };

  /* ---------------- viewer ---------------- */
  class F1TenthCADViewer {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.parts = [];
      this.pickables = [];
      this.explosionProgress = 0;
      this.targetExplosion = 0;
      this.isRotating = true;
      this.selected = null;
      this.onSelect = null;
      this.paused = false;
      this.init();
    }

    init() {
      const w = this.container.clientWidth || 800, h = this.container.clientHeight || 500;
      this.scene = new THREE.Scene();
      this.root = new THREE.Group();
      this.scene.add(this.root);

      this.camera = new THREE.PerspectiveCamera(30, w / h, 0.5, 60);
      this.camera.layers.enableAll();
      this.views = {
        iso: new V3(-4.9, 2.7, 5.2),
        top: new V3(0, 8.2, 0.01),
        side: new V3(-7.6, 1.0, 0),
        front: new V3(0, 1.4, 7.4)
      };
      this.camera.position.copy(this.views.iso);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h);
      this.renderer.setClearColor(0xffffff, 0);
      this.renderer.autoClear = false;
      this.container.appendChild(this.renderer.domElement);

      if (THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 16;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
        this.controls.target.set(0, 0, 0);
        this.controls.addEventListener('start', () => { this.isRotating = false; });
      }

      this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d6cf, 0.95));
      const key = new THREE.DirectionalLight(0xffffff, 0.55);
      key.position.set(-4, 8, 6);
      this.scene.add(key);

      this.setupPostFX(w, h);
      this.buildGround();
      this.buildVehicle();
      this.setupPicking();

      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.onResize()).observe(this.container);
      else window.addEventListener('resize', () => this.onResize());
      this.animate();
    }

    setupPostFX(w, h) {
      const pr = this.renderer.getPixelRatio();
      this.rt = new THREE.WebGLRenderTarget(w * pr, h * pr);
      this.rt.depthTexture = new THREE.DepthTexture(w * pr, h * pr);
      this.rt.depthTexture.type = THREE.UnsignedIntType;
      this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

      this.fxMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(OutlineShader.uniforms),
        vertexShader: OutlineShader.vertexShader,
        fragmentShader: OutlineShader.fragmentShader,
        transparent: true, depthTest: false, depthWrite: false
      });
      this.fxMat.uniforms.tNormal.value = this.rt.texture;
      this.fxMat.uniforms.tDepth.value = this.rt.depthTexture;
      this.fxMat.uniforms.texel.value.set(1 / (w * pr), 1 / (h * pr));
      this.fxMat.uniforms.near.value = this.camera.near;
      this.fxMat.uniforms.far.value = this.camera.far;
      this.fxScene = new THREE.Scene();
      this.fxScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.fxMat));
      this.fxCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    buildGround() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      grd.addColorStop(0, 'rgba(20,20,20,0.20)');
      grd.addColorStop(0.55, 'rgba(20,20,20,0.07)');
      grd.addColorStop(1, 'rgba(20,20,20,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 6.2),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.549;
      shadow.layers.set(LAYER_FX);
      this.root.add(shadow);
    }

    /* ---------- part builder ---------- */
    makePart(id, name, description, explode) {
      const group = new THREE.Group();
      const part = {
        id, name, description, group,
        basePos: new V3(), explodeVec: explode.clone(),
        fills: [], lineMat: new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.42, depthWrite: false })
      };
      const fill = (opacity, color) => {
        const m = new THREE.MeshStandardMaterial({
          color: color || 0xffffff, roughness: 0.9, metalness: 0, transparent: true,
          opacity, depthWrite: false, side: THREE.DoubleSide
        });
        m.userData.base = { color: m.color.clone(), opacity };
        part.fills.push(m);
        return m;
      };
      part.mat = {
        shell: fill(0.34), solid: fill(0.58), dense: fill(0.8),
        grey: fill(0.55, 0xc9c8c4), dark: fill(0.7, 0x8d8c88)
      };
      // add(mesh geometry, material key, position, rotation, edge threshold | false)
      part.add = (geo, matKey, pos, rot, edges = 28, parent) => {
        const mesh = new THREE.Mesh(geo, part.mat[matKey || 'solid']);
        if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
        if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
        mesh.userData.partId = id;
        (parent || group).add(mesh);
        this.pickables.push(mesh);
        if (edges !== false) {
          const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, edges), part.lineMat);
          l.layers.set(LAYER_LINES);
          mesh.add(l);
        }
        return mesh;
      };
      part.line = (pts, parent) => {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), part.lineMat);
        l.layers.set(LAYER_LINES);
        (parent || group).add(l);
        return l;
      };
      part.rod = (a, b, r, matKey, parent) => {
        const holder = new THREE.Group();
        const len = alignY(holder, a, b);
        const geo = new THREE.CylinderGeometry(r, r, len, 14);
        const mesh = new THREE.Mesh(geo, part.mat[matKey || 'solid']);
        mesh.userData.partId = id;
        holder.add(mesh);
        this.pickables.push(mesh);
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), part.lineMat);
        l.layers.set(LAYER_LINES);
        holder.add(l);
        (parent || group).add(holder);
        return holder;
      };
      part.finish = () => {
        part.basePos.copy(group.position);
        this.root.add(group);
        this.parts.push(part);
      };
      return part;
    }

    /* ---------- vehicle ---------- */
    buildVehicle() {
      const WX = 1.0, WZ = 1.3, WY = -0.13, R = 0.42;

      /* Chassis */
      const ch = this.makePart('chassis', 'Chassis and drivetrain',
        'The base of the car. It holds the front and rear gearboxes, the driveshaft that connects them, and a foam bumper for crashes.', new V3(0, 0, 0));
      const outline = [[0.32, 1.95], [0.48, 1.72], [0.48, 1.0], [0.6, 0.62], [0.6, -0.9], [0.48, -1.28], [0.48, -1.88], [0.32, -1.98],
        [-0.32, -1.98], [-0.48, -1.88], [-0.48, -1.28], [-0.6, -0.9], [-0.6, 0.62], [-0.48, 1.0], [-0.48, 1.72], [-0.32, 1.95]];
      const plate = polyShape(outline);
      plate.holes.push(slotPath(0, 0.55, 0.16, 0.5), slotPath(0, -0.45, 0.16, 0.6), circlePath(0.36, 1.45, 0.05), circlePath(-0.36, 1.45, 0.05),
        circlePath(0.36, -1.6, 0.05), circlePath(-0.36, -1.6, 0.05));
      ch.add(plateGeo(plate, 0.05), 'solid', [0, -0.23, 0], null, 20);
      // gearboxes + diffs
      [WZ, -WZ].forEach(z => {
        ch.add(new THREE.BoxGeometry(0.5, 0.26, 0.36), 'shell', [0, -0.05, z]);
        ch.add(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 24), 'grey', [0, WY, z], [0, 0, Math.PI / 2]);
        ch.add(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 20), 'shell', [0, WY, z], [0, 0, Math.PI / 2]);
      });
      ch.rod(new V3(0, -0.08, WZ - 0.2), new V3(0, -0.08, -WZ + 0.2), 0.025, 'grey');
      // spur gear on centre shaft
      ch.add(new THREE.ExtrudeGeometry(gearShape(0.2, 0.18, 44, 0.03), { depth: 0.035, bevelEnabled: false }), 'solid', [0, -0.03, -0.2], null, 40);
      // bumper
      const bump = new THREE.ExtrudeGeometry(roundedRectShape(1.15, 0.32, 0.14), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3 });
      bump.rotateX(-Math.PI / 2);
      ch.add(bump, 'shell', [0, -0.26, 2.04], null, 35);
      ch.finish();

      /* Wheels */
      const wheelDefs = [
        { x: WX, z: WZ, n: 'Front-Right' }, { x: -WX, z: WZ, n: 'Front-Left' },
        { x: WX, z: -WZ, n: 'Rear-Right' }, { x: -WX, z: -WZ, n: 'Rear-Left' }
      ];
      wheelDefs.forEach((d, i) => {
        const p = this.makePart('wheel_' + i, d.n + ' wheel',
          'A rubber tire on a spoked rim. A short drive shaft connects it to the gearbox so the motor can turn it.',
          new V3(Math.sign(d.x) * 0.85, 0, Math.sign(d.z) * 0.3));
        const s = Math.sign(d.x);
        p.group.position.set(d.x, WY, d.z);
        const prof = [[0.27, -0.17], [0.34, -0.18], [0.385, -0.172], [0.41, -0.15], [0.42, -0.11], [0.422, 0], [0.42, 0.11], [0.41, 0.15], [0.385, 0.172], [0.34, 0.18], [0.27, 0.17]]
          .map(q => new THREE.Vector2(q[0], q[1]));
        const tyre = new THREE.LatheGeometry(prof, 56);
        tyre.rotateZ(Math.PI / 2);
        p.add(tyre, 'solid', null, null, false);
        [-0.16, -0.11, -0.055, 0, 0.055, 0.11, 0.16].forEach(x => {
          const r = Math.abs(x) > 0.15 ? 0.39 : 0.4225;
          const l = p.line(circlePoints(r, 72, 'x'));
          l.position.x = x;
        });
        p.add(new THREE.CylinderGeometry(0.27, 0.27, 0.3, 48, 1, true), 'shell', null, [0, 0, Math.PI / 2]);
        p.add(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 24), 'solid', [s * 0.1, 0, 0], [0, 0, Math.PI / 2]);
        p.add(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6), 'dense', [s * 0.18, 0, 0], [0, 0, Math.PI / 2]);
        // rim face + lip
        const face = new THREE.RingGeometry(0.075, 0.262, 48);
        face.rotateY(Math.PI / 2);
        p.add(face, 'shell', [s * 0.07, 0, 0], null, false);
        p.add(new THREE.TorusGeometry(0.262, 0.014, 8, 48), 'solid', [s * 0.12, 0, 0], [0, Math.PI / 2, 0], false);
        p.line(circlePoints(0.262, 64, 'x')).position.x = s * 0.135;
        p.line(circlePoints(0.24, 64, 'x')).position.x = s * 0.1;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          p.add(new THREE.BoxGeometry(0.03, 0.17, 0.05), 'solid', [s * 0.095, Math.cos(a) * 0.165, Math.sin(a) * 0.165], [a, 0, 0]);
        }
        p.finish();
      });

      /* Suspension (front + rear) */
      [['susp_front', 'Front suspension', 1], ['susp_rear', 'Rear suspension', -1]].forEach(([id, name, f]) => {
        const p = this.makePart(id, name,
          'The arms, springs, and oil-filled shocks that let each wheel move up and down so the tires stay on the ground over bumps.',
          new V3(0, 0.15, f * 0.4));
        const zT = f * (WZ - 0.32);
        // shock tower
        const tw = polyShape([[-0.36, -0.12], [0.36, -0.12], [0.78, 0.36], [0.72, 0.46], [-0.72, 0.46], [-0.78, 0.36]]);
        tw.holes.push(slotPath(0, 0.2, 0.36, 0.12), circlePath(0.6, 0.38, 0.03), circlePath(-0.6, 0.38, 0.03), circlePath(0.48, 0.38, 0.03), circlePath(-0.48, 0.38, 0.03));
        p.add(wallGeo(tw, 0.045), 'solid', [0, 0, zT], null, 20);
        [1, -1].forEach(s => {
          const hub = new V3(s * 0.84, WY, f * WZ);
          // hub carrier / steering knuckle
          p.add(new THREE.BoxGeometry(0.08, 0.3, 0.18), 'solid', [hub.x, hub.y, hub.z]);
          // lower A-arm
          p.rod(new V3(s * 0.28, -0.2, f * WZ + 0.17), new V3(s * 0.8, -0.24, f * WZ), 0.028);
          p.rod(new V3(s * 0.28, -0.2, f * WZ - 0.17), new V3(s * 0.8, -0.24, f * WZ), 0.028);
          // camber link
          p.rod(new V3(s * 0.2, 0.12, f * WZ), new V3(s * 0.8, 0.03, f * WZ), 0.02, 'grey');
          // dogbone
          p.rod(new V3(s * 0.25, WY, f * WZ), new V3(s * 0.8, WY, f * WZ), 0.03, 'grey');
          // coil-over shock
          const a = new V3(s * 0.7, -0.2, f * (WZ - 0.04)), b = new V3(s * 0.6, 0.4, zT);
          const sh = new THREE.Group();
          const len = alignY(sh, a, b);
          p.group.add(sh);
          p.add(new THREE.CylinderGeometry(0.05, 0.05, len * 0.55, 18), 'solid', [0, len * 0.18, 0], null, 28, sh);
          p.add(new THREE.CylinderGeometry(0.016, 0.016, len * 0.45, 10), 'grey', [0, -len * 0.25, 0], null, 28, sh);
          p.add(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 20), 'dense', [0, len * 0.46, 0], null, 28, sh);
          p.add(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), 'dense', [0, -len * 0.18, 0], null, 28, sh);
          const spring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPoints(0.07, len * 0.62, 8, 260)),
            new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 }));
          spring.position.y = len * 0.13;
          spring.layers.set(LAYER_LINES);
          sh.add(spring);
        });
        // steering linkage (front only)
        if (f > 0) {
          p.rod(new V3(-0.82, -0.05, WZ + 0.17), new V3(0.82, -0.05, WZ + 0.17), 0.018, 'grey');
        }
        p.finish();
      });

      /* Powertrain */
      const pw = this.makePart('powertrain', 'Motor and speed controller',
        'The drive motor turns a small gear that spins a bigger gear on the driveshaft. The speed controller (ESC) decides how much power the motor gets.', new V3(0.75, 0.1, -0.1));
      const mz = -0.55, mx = 0.3, my = 0.0;
      pw.add(new THREE.CylinderGeometry(0.19, 0.19, 0.6, 32), 'grey', [mx, my, mz], [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 7; k++) pw.add(new THREE.CylinderGeometry(0.212, 0.212, 0.025, 32), 'solid', [mx, my, mz - 0.22 + k * 0.06], [Math.PI / 2, 0, 0]);
      pw.add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 28), 'solid', [mx, my, mz - 0.35], [Math.PI / 2, 0, 0]);
      pw.add(new THREE.BoxGeometry(0.06, 0.04, 0.05), 'dense', [mx + 0.09, my + 0.15, mz - 0.35]);
      pw.add(new THREE.BoxGeometry(0.06, 0.04, 0.05), 'dense', [mx - 0.09, my + 0.15, mz - 0.35]);
      pw.add(new THREE.ExtrudeGeometry(gearShape(0.085, 0.07, 16, 0.015), { depth: 0.05, bevelEnabled: false }), 'dense', [mx - 0.02, my, -0.25], null, 40);
      // motor mount
      pw.add(new THREE.BoxGeometry(0.06, 0.32, 0.36), 'solid', [mx - 0.24, -0.04, mz + 0.1]);
      // ESC
      pw.add(new THREE.BoxGeometry(0.36, 0.17, 0.44), 'solid', [0.3, -0.095, 0.35]);
      for (let k = 0; k < 6; k++) pw.add(new THREE.BoxGeometry(0.018, 0.08, 0.4), 'shell', [0.18 + k * 0.048, 0.03, 0.35]);
      pw.add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 24), 'shell', [0.3, 0.085, 0.35]);
      pw.finish();

      /* Power electronics */
      const bt = this.makePart('battery', 'Battery and power',
        'The 7.4 V LiPo battery powers everything. A separate 5 V regulator and a 5 A fuse give the Raspberry Pi its own clean power.', new V3(-0.8, 0.12, -0.1));
      const lipo = new THREE.ExtrudeGeometry(roundedRectShape(0.4, 1.3, 0.04), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
      lipo.rotateX(-Math.PI / 2);
      bt.add(lipo, 'solid', [-0.3, -0.16, -0.3], null, 35);
      bt.add(new THREE.BoxGeometry(0.46, 0.012, 0.07), 'dense', [-0.3, 0.075, -0.05]);
      bt.add(new THREE.BoxGeometry(0.46, 0.012, 0.07), 'dense', [-0.3, 0.075, -0.6]);
      bt.add(new THREE.BoxGeometry(0.2, 0.08, 0.3), 'dense', [-0.3, -0.14, 0.62]);
      bt.add(new THREE.BoxGeometry(0.1, 0.12, 0.18), 'solid', [-0.3, -0.12, 0.92]);
      bt.add(new THREE.BoxGeometry(0.06, 0.03, 0.08), 'dense', [-0.3, -0.045, 0.92]);
      bt.finish();

      /* Steering servo */
      const sv = this.makePart('servo', 'Steering servo',
        'A small motor that turns to an exact angle. The ESP32 tells it where to point, and a rod connects it to the front wheels to steer.', new V3(-0.3, 0.35, 0.5));
      sv.add(new THREE.BoxGeometry(0.2, 0.36, 0.4), 'solid', [-0.3, -0.02, 1.0]);
      sv.add(new THREE.BoxGeometry(0.2, 0.025, 0.56), 'solid', [-0.3, 0.08, 1.0]);
      sv.add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), 'dense', [-0.3, 0.185, 1.08]);
      sv.add(new THREE.BoxGeometry(0.04, 0.02, 0.2), 'dense', [-0.3, 0.21, 1.15]);
      sv.rod(new V3(-0.3, 0.21, 1.24), new V3(-0.05, -0.05, WZ + 0.17), 0.014, 'grey');
      sv.finish();

      /* Upper deck */
      const ud = this.makePart('upper_deck', 'Upper deck',
        'A second level that sits on metal posts. It keeps the computer boards up and away from the motor and battery.', new V3(0, 0.6, 0));
      const deck = polyShape([[0.4, 1.12], [0.5, 0.9], [0.5, -1.0], [0.36, -1.12], [-0.36, -1.12], [-0.5, -1.0], [-0.5, 0.9], [-0.4, 1.12]]);
      deck.holes.push(slotPath(0, 0.05, 0.12, 0.3), circlePath(0.38, 0.75, 0.03), circlePath(-0.38, 0.75, 0.03), circlePath(0.38, -0.85, 0.03), circlePath(-0.38, -0.85, 0.03));
      ud.add(plateGeo(deck, 0.035), 'solid', [0, 0.3, 0], null, 20);
      [[0.4, 0.82], [-0.4, 0.82], [0.4, -0.92], [-0.4, -0.92], [0.44, -0.05], [-0.44, -0.05]].forEach(([x, z]) =>
        ud.add(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 6), 'grey', [x, 0.055, z]));
      ud.finish();

      /* Raspberry Pi 5 */
      const pi = this.makePart('rpi5', 'Raspberry Pi 5',
        'The main computer on the car. It reads the LiDAR, runs the driving policy I trained, and sends data to my laptop over Wi-Fi.', new V3(0, 1.05, -0.1));
      const py = 0.35, pz = -0.42;
      pi.add(new THREE.ExtrudeGeometry(roundedRectShape(0.56, 0.85, 0.03), { depth: 0.022, bevelEnabled: false }).rotateX(-Math.PI / 2), 'dense', [0, py, pz], null, 20);
      pi.add(new THREE.BoxGeometry(0.22, 0.02, 0.22), 'grey', [0.04, py + 0.032, pz + 0.05]);
      for (let k = 0; k < 7; k++) pi.add(new THREE.BoxGeometry(0.012, 0.06, 0.22), 'solid', [-0.05 + k * 0.03, py + 0.07, pz + 0.05]);
      pi.add(new THREE.BoxGeometry(0.14, 0.16, 0.17), 'solid', [0.17, py + 0.1, pz - 0.36]);
      pi.add(new THREE.BoxGeometry(0.14, 0.16, 0.17), 'solid', [-0.01, py + 0.1, pz - 0.36]);
      pi.add(new THREE.BoxGeometry(0.15, 0.13, 0.17), 'solid', [-0.18, py + 0.085, pz - 0.36]);
      pi.add(new THREE.BoxGeometry(0.06, 0.05, 0.56), 'dense', [-0.24, py + 0.045, pz + 0.05]);
      pi.finish();

      /* ESP32-S3 */
      const es = this.makePart('esp32', 'ESP32-S3',
        'A tiny controller board. It gets steering and speed commands from the Pi and turns them into exact signals for the servo and motor.', new V3(0.3, 0.95, 0.25));
      es.add(new THREE.BoxGeometry(0.24, 0.02, 0.5), 'dense', [0.28, 0.345, 0.32]);
      es.add(new THREE.BoxGeometry(0.16, 0.03, 0.2), 'grey', [0.28, 0.37, 0.4]);
      es.add(new THREE.BoxGeometry(0.08, 0.03, 0.05), 'solid', [0.28, 0.365, 0.08]);
      es.add(new THREE.BoxGeometry(0.03, 0.035, 0.44), 'solid', [0.18, 0.37, 0.32]);
      es.add(new THREE.BoxGeometry(0.03, 0.035, 0.44), 'solid', [0.38, 0.37, 0.32]);
      es.finish();

      /* LiDAR */
      const ld = this.makePart('lidar', 'LD19 LiDAR',
        'A spinning laser sensor on a small tower. It measures the distance to the walls all around the car. The orange line shows its sweep.', new V3(0, 1.35, 0.15));
      const lz = 0.42;
      [[0.12, 0.12], [-0.12, 0.12], [0.12, -0.12], [-0.12, -0.12]].forEach(([x, z]) =>
        ld.add(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 6), 'grey', [x, 0.41, lz + z]));
      ld.add(new THREE.BoxGeometry(0.34, 0.02, 0.34), 'solid', [0, 0.495, lz]);
      ld.add(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 40), 'solid', [0, 0.555, lz]);
      ld.add(new THREE.CylinderGeometry(0.165, 0.165, 0.045, 40), 'shell', [0, 0.628, lz]);
      ld.add(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 40), 'solid', [0, 0.68, lz]);
      ld.add(new THREE.BoxGeometry(0.06, 0.03, 0.03), 'dense', [0, 0.628, lz + 0.165]);
      ld.finish();
      // scan sweep (FX layer, follows lidar)
      const scan = new THREE.Group();
      scan.position.set(0, 0.628, lz);
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePoints(1.7, 160, 'y')),
        new THREE.LineDashedMaterial({ color: SIGNAL, dashSize: 0.05, gapSize: 0.07, transparent: true, opacity: 0.4 }));
      ring.computeLineDistances();
      const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, 0, 0), new V3(1.7, 0, 0)]),
        new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.7 }));
      [ring, beam].forEach(o => { o.layers.set(LAYER_FX); scan.add(o); });
      ld.group.add(scan);
      this.scanBeam = beam;

      /* Camera */
      const cm = this.makePart('camera', 'Camera',
        'A small camera that streams video from the car\'s point of view, so I can see what the car sees when I drive it by hand.', new V3(0, 0.95, 0.6));
      cm.rod(new V3(0, 0.33, 0.98), new V3(0, 0.52, 0.98), 0.02, 'grey');
      cm.add(new THREE.BoxGeometry(0.3, 0.025, 0.08), 'solid', [0, 0.53, 0.98]);
      cm.add(new THREE.BoxGeometry(0.025, 0.2, 0.08), 'solid', [0.14, 0.62, 0.98]);
      cm.add(new THREE.BoxGeometry(0.025, 0.2, 0.08), 'solid', [-0.14, 0.62, 0.98]);
      cm.add(new THREE.BoxGeometry(0.22, 0.2, 0.05), 'solid', [0, 0.66, 1.0]);
      cm.add(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 24), 'dense', [0, 0.66, 1.06], [Math.PI / 2, 0, 0]);
      cm.add(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), 'grey', [0, 0.66, 1.105], [Math.PI / 2, 0, 0]);
      cm.finish();
    }

    /* ---------- picking ---------- */
    setupPicking() {
      const ray = new THREE.Raycaster();
      const v = new THREE.Vector2();
      let down = null;
      const el = this.renderer.domElement;
      el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
      el.addEventListener('pointerup', e => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
        const r = el.getBoundingClientRect();
        v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(v, this.camera);
        const hit = ray.intersectObjects(this.pickables, false)[0];
        const id = hit ? hit.object.userData.partId : null;
        this.select(id);
        if (this.onSelect) this.onSelect(id ? this.parts.find(p => p.id === id) : null);
      });
    }
    select(id) {
      this.selected = id;
      this.parts.forEach(p => {
        const on = id && p.id === id;
        const dim = id && !on;
        p.lineMat.color.set(on ? SIGNAL : INK);
        p.lineMat.opacity = on ? 0.95 : dim ? 0.18 : 0.42;
        p.fills.forEach(m => {
          m.color.copy(on ? new THREE.Color(0xffd9c7) : m.userData.base.color);
          m.opacity = on ? Math.min(1, m.userData.base.opacity + 0.2) : dim ? m.userData.base.opacity * 0.55 : m.userData.base.opacity;
        });
      });
    }

    highlightPart(id) {
      this.select(id);
      return this.parts.find(p => p.id === id) || null;
    }

    setExplosion(v) { this.targetExplosion = Math.max(0, Math.min(1, v)); }
    toggleExplosion() { this.setExplosion(this.targetExplosion > 0.5 ? 0 : 1); }

    setView(name) {
      if (!this.views[name]) return;
      this.isRotating = false;
      this.root.rotation.y = 0;
      this.camFrom = this.camera.position.clone();
      this.camTo = this.views[name].clone();
      this.camT = 0;
      if (this.controls) this.controls.target.set(0, 0.15 * this.explosionProgress, 0);
    }

    onResize() {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      this.rt.setSize(w * pr, h * pr);
      this.fxMat.uniforms.texel.value.set(1 / (w * pr), 1 / (h * pr));
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      if (this.paused) return;

      this.explosionProgress += (this.targetExplosion - this.explosionProgress) * 0.08;
      const e = this.explosionProgress;
      this.parts.forEach(p => p.group.position.copy(p.basePos).addScaledVector(p.explodeVec, e));

      if (this.scanBeam) this.scanBeam.parent.rotation.y -= 0.035;
      if (this.isRotating) this.root.rotation.y += 0.0025;
      if (this.controls) this.controls.target.y = 0.15 * e;

      if (this.camTo) {
        this.camT = Math.min(1, this.camT + 0.04);
        const k = 1 - Math.pow(1 - this.camT, 3);
        this.camera.position.lerpVectors(this.camFrom, this.camTo, k);
        if (this.camT >= 1) this.camTo = null;
      }
      if (this.controls) this.controls.update();

      const r = this.renderer;
      // 1) normal + depth pass (solid surfaces only) for the ink silhouettes
      r.setRenderTarget(this.rt);
      r.setClearColor(0x000000, 0);
      r.clear();
      this.camera.layers.set(0);
      this.scene.overrideMaterial = this.normalMat;
      r.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
      this.camera.layers.enableAll();
      // 2) ghosted shading + crease lines
      r.setRenderTarget(null);
      r.setClearColor(0xffffff, 0);
      r.clear();
      r.render(this.scene, this.camera);
      // 3) silhouettes on top
      r.render(this.fxScene, this.fxCam);
    }
  }

  window.F1TenthCADViewer = F1TenthCADViewer;
})();
