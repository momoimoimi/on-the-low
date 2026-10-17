// Momoimoimi, shared by every 3D scene.
// OTL.createMomo() builds the stand-in low-poly model right away. If models/momoimoimi.glb exists
// (exported from Blender) and GLTFLoader is on the page, it swaps itself for that model.
(() => {
  const OTL = (window.OTL = window.OTL || {});
  const MODEL_URL = 'models/momoimoimi.glb';

  // Run a scene's frame() only while its canvas is on screen and the tab is visible,
  // so phones don't spend battery drawing 3D nobody is looking at.
  OTL.renderLoop = (canvas, frame) => {
    let onScreen = true, raf = 0;
    const tick = () => { raf = 0; frame(); schedule(); };
    const schedule = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(tick); };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; schedule(); }).observe(canvas);
    document.addEventListener('visibilitychange', schedule);
    frame();
    schedule();
  };
  // Phones get a lower pixel ratio: the faceted look survives it and it saves a lot of work
  OTL.pixelRatio = () => Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);

  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.95, metalness: 0 }, extra));
  OTL.flat = flat;

  const triCount = root => {
    let n = 0;
    root.traverse(o => {
      if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    });
    return n;
  };
  OTL.triCount = triCount;

  // onModel(info) is called once with { source: 'stand-in' | 'blender', tris }
  OTL.createMomo = (onModel = () => {}) => {
    const group = new THREE.Group();     // move / rotate this
    const body = new THREE.Group();      // squash this on kicks
    group.add(body);

    const standIn = new THREE.Group();
    const add = (geo, mat, setup) => { const m = new THREE.Mesh(geo, mat); setup && setup(m); standIn.add(m); return m; };
    add(new THREE.IcosahedronGeometry(0.9, 1), flat(0xff9f8c), m => m.scale.set(1, 0.95, 0.92));
    add(new THREE.ConeGeometry(0.06, 0.32, 4), flat(0x7a5a48), m => m.position.set(0, 0.95, 0));
    add(new THREE.ConeGeometry(0.2, 0.6, 4), flat(0x6fd6b8), m => { m.position.set(0.22, 1.02, 0); m.rotation.z = -1.1; m.scale.z = 0.35; });
    const eyeMat = flat(0x1a1626);
    [-0.28, 0.28].forEach(x => add(new THREE.SphereGeometry(0.075, 6, 4), eyeMat, m => m.position.set(x, 0.08, 0.83)));
    const cheekMat = flat(0xff7f86, { emissive: 0xff7f86, emissiveIntensity: 0.2 });
    [-0.5, 0.5].forEach(x => add(new THREE.CircleGeometry(0.11, 6), cheekMat, m => { m.position.set(x, -0.1, 0.74); m.rotation.y = x * 1.1; }));
    add(new THREE.TorusGeometry(0.98, 0.07, 4, 14, Math.PI), flat(0x2c2640));
    [-1, 1].forEach(s => add(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 6), flat(0x9d8cff), m => { m.position.set(0.97 * s, 0, 0); m.rotation.z = Math.PI / 2; }));
    [-0.35, 0.35].forEach(x => add(new THREE.DodecahedronGeometry(0.2, 0), flat(0xe8857a), m => m.position.set(x, -0.85, 0.15)));
    body.add(standIn);
    onModel({ source: 'stand-in', tris: triCount(standIn) });

    // Swap in the Blender model when it is there. Opening index.html straight from disk blocks this
    // load in most browsers, so the stand-in stays; on a local server or GitHub Pages it works.
    if (THREE.GLTFLoader && location.protocol !== 'file:') {
      new THREE.GLTFLoader().load(MODEL_URL, gltf => {
        const model = gltf.scene;
        // Fit to the stand-in's size: about 1.9 tall, centered, feet at -0.95
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const s = 1.9 / Math.max(size.y, 0.0001);
        model.scale.setScalar(s);
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x * s, -c.y * s, -c.z * s);
        model.traverse(o => { if (o.isMesh && o.material) o.material.flatShading = true; });
        body.remove(standIn);
        body.add(model);
        onModel({ source: 'blender', tris: triCount(model) });
      }, undefined, () => { /* no model yet: keep the stand-in */ });
    }

    return { group, body };
  };

  // The Mamekura pair: green beans. elder = 豆蔵豆蔵 (white brows, moustache, cane), otherwise 豆蔵豆行 (small, a sprout on top)
  OTL.createBean = ({ elder = false } = {}) => {
    const group = new THREE.Group(), body = new THREE.Group();
    group.add(body);
    const add = (geo, mat, setup) => { const m = new THREE.Mesh(geo, mat); setup && setup(m); body.add(m); return m; };
    const r = elder ? 0.55 : 0.38;
    const green = flat(elder ? 0x7cc46b : 0x8fd47a);
    add(new THREE.IcosahedronGeometry(r, 1), green, m => { m.scale.set(0.78, 1.05, 0.72); });
    const eye = flat(0x1a1626), white = flat(0xece6f6);
    [-1, 1].forEach(s => {
      add(new THREE.SphereGeometry(elder ? 0.045 : 0.06, 6, 4), eye, m => m.position.set(s * r * 0.3, r * 0.15, r * 0.66));
      if (elder) add(new THREE.BoxGeometry(0.14, 0.035, 0.04), white, m => { m.position.set(s * r * 0.3, r * 0.32, r * 0.64); m.rotation.z = -s * 0.2; });
      add(new THREE.DodecahedronGeometry(r * 0.24, 0), flat(elder ? 0x5ea24f : 0x6cb85c), m => m.position.set(s * r * 0.35, -r * 1.02, r * 0.1));
    });
    if (elder) {
      add(new THREE.OctahedronGeometry(0.14, 0), white, m => { m.scale.set(1.6, 0.45, 0.6); m.position.set(0, -r * 0.08, r * 0.68); });
      add(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5), flat(0x7a5a48), m => { m.position.set(r * 0.85, -0.12, 0.1); m.rotation.z = 0.1; });
      add(new THREE.ConeGeometry(0.05, 0.18, 4), flat(0x7a5a48), m => m.position.set(0, r * 1.1, 0));
    } else {
      [-1, 1].forEach(s => add(new THREE.SphereGeometry(0.018, 4, 3), white, m => m.position.set(s * r * 0.3 + 0.015, r * 0.2, r * 0.7)));
      add(new THREE.ConeGeometry(0.03, 0.16, 4), flat(0x7a5a48), m => m.position.set(0, r * 1.1, 0));
      add(new THREE.ConeGeometry(0.09, 0.26, 4), flat(0x6fd6b8), m => { m.position.set(0.09, r * 1.22, 0); m.rotation.z = -1; m.scale.z = 0.35; });
    }
    return { group, body };
  };

  // Sleeping z's that drift up from a point. update(t, on) each frame.
  OTL.createZzz = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ece6f6';
    x.font = '700 44px "DM Mono", monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('z', 32, 34);
    const tex = new THREE.CanvasTexture(c);
    const group = new THREE.Group();
    const zs = [0, 1, 2].map(i => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
      group.add(s);
      return { s, off: i / 3 };
    });
    let fade = 0;
    return {
      group,
      update(t, on) {
        fade += ((on ? 1 : 0) - fade) * 0.05;
        zs.forEach(({ s, off }) => {
          const u = (t * 0.35 + off) % 1;
          s.position.set(Math.sin(u * 5 + off * 9) * 0.25 + u * 0.5, u * 1.3, 0);
          const k = 0.18 + u * 0.22;
          s.scale.set(k, k, k);
          s.material.opacity = Math.sin(u * Math.PI) * 0.85 * fade;
        });
      }
    };
  };
})();
