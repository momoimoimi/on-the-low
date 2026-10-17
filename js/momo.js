// Momoimoimi, shared by every 3D scene.
// OTL.createMomo() builds the stand-in low-poly model right away. If models/momoimoimi.glb exists
// (exported from Blender) and GLTFLoader is on the page, it swaps itself for that model.
(() => {
  const OTL = (window.OTL = window.OTL || {});
  const MODEL_URL = 'models/momoimoimi.glb';

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
})();
