function initHead3D() {
  const container = document.querySelector('.head-3d-wrapper');
  if (!container) return;
  const infoBox = container.querySelector('.head-zone-info');
  const canvas = document.getElementById('headCanvas');
  if (!canvas) return;

  const W = container.clientWidth, H = container.clientHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1E1F21);

  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
  camera.position.set(0, 0.2, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Studio lighting
  scene.add(new THREE.AmbientLight(0x9E9590, 0.4));
  const keyLight = new THREE.DirectionalLight(0xFFF0E0, 1.1);
  keyLight.position.set(2.5, 3, 4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xC5A55A, 0.25);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xD4B96E, 0.5);
  rimLight.position.set(-1, 2, -4);
  scene.add(rimLight);
  const bottomLight = new THREE.DirectionalLight(0x787C7E, 0.15);
  bottomLight.position.set(0, -2, 2);
  scene.add(bottomLight);

  const hoverMat = new THREE.MeshPhysicalMaterial({
    color: 0xC5A55A, metalness: 0.1, roughness: 0.35,
    clearcoat: 0.3, emissive: 0x8B7232, emissiveIntensity: 0.25,
  });

  const headGroup = new THREE.Group();
  scene.add(headGroup);

  let headMesh = null;
  let originalMaterial = null;

  // Load GLB model
  const loader = new THREE.GLTFLoader();
  loader.load('img/head.glb', function(gltf) {
    const model = gltf.scene;

    model.traverse(function(child) {
      if (child.isMesh) {
        headMesh = child;
        // Override material with premium skin material
        headMesh.material = new THREE.MeshPhysicalMaterial({
          color: 0x9C8B78,
          metalness: 0.0,
          roughness: 0.55,
          clearcoat: 0.15,
          clearcoatRoughness: 0.5,
        });
        originalMaterial = headMesh.material;
        headMesh.userData = { zone: 'density', orig: originalMaterial };
      }
    });

    headGroup.add(model);

    // Add SMP dots on the scalp
    addSMPDots(headGroup);
    // Add scar line
    addScarLine(headGroup);
    // Add hairline
    addHairline(headGroup);

  }, undefined, function(err) {
    console.warn('GLB load failed, using fallback:', err);
    // Fallback: simple sphere head
    const geo = new THREE.SphereGeometry(1.0, 64, 48);
    const mat = new THREE.MeshPhysicalMaterial({color: 0x9C8B78, roughness: 0.55, clearcoat: 0.15});
    headMesh = new THREE.Mesh(geo, mat);
    originalMaterial = mat;
    headMesh.userData = { zone: 'density', orig: mat };
    headMesh.scale.set(1, 1.25, 1.13);
    headGroup.add(headMesh);
    addSMPDots(headGroup);
  });

  function addSMPDots(group) {
    const dotGeo = new THREE.SphereGeometry(0.008, 4, 4);
    const dotMat1 = new THREE.MeshBasicMaterial({ color: 0x3A3C3E });
    const dotMat2 = new THREE.MeshBasicMaterial({ color: 0x2E3032 });
    for (let i = 0; i < 800; i++) {
      const phi = Math.random() * Math.PI * 0.42;
      const theta = Math.random() * Math.PI * 2;
      const r = 1.03 + Math.random() * 0.01;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 1.25 - 0.1;
      const z = r * Math.sin(phi) * Math.sin(theta) * 1.13;
      const dot = new THREE.Mesh(dotGeo, Math.random() > 0.5 ? dotMat1 : dotMat2);
      dot.position.set(x, y, z);
      group.add(dot);
    }
  }

  function addScarLine(group) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 0.5 + Math.PI * 0.75;
      pts.push(new THREE.Vector3(
        1.04 * Math.sin(Math.PI * 0.42) * Math.cos(t),
        -0.22 + Math.sin(i * 0.5) * 0.01,
        1.04 * Math.sin(Math.PI * 0.42) * Math.sin(t) * 1.13
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 40, 0.008, 6, false);
    group.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0xC5A55A, transparent: true, opacity: 0.4 })));
  }

  function addHairline(group) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x4A4540, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 1.2 - Math.PI * 0.6;
      const hx = 1.03 * Math.cos(angle) * (0.7 + Math.random() * 0.15);
      const hy = 1.1 + Math.random() * 0.08;
      const hz = 1.03 * Math.sin(angle) * 0.4 + 0.55 + Math.random() * 0.05;
      if (hz > 0.3) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), mat);
        dot.position.set(hx, hy, hz);
        group.add(dot);
      }
    }
  }

  // Interactive zones (invisible spheres for raycasting)
  const zoneMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });

  const topZone = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI*2, 0, Math.PI*0.35), zoneMat.clone());
  topZone.scale.set(1, 1.25, 1.13);
  topZone.position.y = -0.1;
  topZone.userData = { zone:'density', title:'Densité / Effet Rasé', titleES:'Densidad / Efecto Rapado', price:'300 € — 2 000 €' };
  headGroup.add(topZone);

  const crownZone = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), zoneMat.clone());
  crownZone.position.set(0, 1.05, -0.15);
  crownZone.scale.set(1, 0.25, 1);
  crownZone.userData = { zone:'crown', title:'Cuir chevelu + Cicatrices', titleES:'Cuero cabelludo + Cicatrices', price:'Sur devis' };
  headGroup.add(crownZone);

  const backZone = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 16, Math.PI*0.6, Math.PI*0.8, Math.PI*0.25, Math.PI*0.3), zoneMat.clone());
  backZone.scale.set(1, 1.25, 1.13);
  backZone.position.y = -0.1;
  backZone.userData = { zone:'scars', title:'Cicatrices FUE / FUT', titleES:'Cicatrices FUE / FUT', price:'550 € — 1 500 €' };
  headGroup.add(backZone);

  const tmpL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), zoneMat.clone());
  tmpL.position.set(-0.85, 0.25, 0.5);
  tmpL.userData = { zone:'small', title:'Petites surfaces', titleES:'Pequeñas superficies', price:'Sur devis' };
  headGroup.add(tmpL);
  const tmpR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), zoneMat.clone());
  tmpR.position.set(0.85, 0.25, 0.5);
  tmpR.userData = { zone:'small', title:'Petites surfaces', titleES:'Pequeñas superficies', price:'Sur devis' };
  headGroup.add(tmpR);

  const zoneMeshes = [topZone, crownZone, backZone, tmpL, tmpR];

  // Mouse/Touch interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-5, -5);
  let isDragging = false, prevMouse = {x:0,y:0};
  let rotY = 0, rotX = 0, targetRotY = 0, targetRotX = 0;
  let autoRotate = true, autoTimer;
  let prevZone = null;

  function startDrag(ex,ey){isDragging=true;autoRotate=false;prevMouse={x:ex,y:ey};clearTimeout(autoTimer);}
  function moveDrag(ex,ey){if(!isDragging)return;targetRotY+=(ex-prevMouse.x)*0.007;targetRotX+=(ey-prevMouse.y)*0.004;targetRotX=Math.max(-0.4,Math.min(0.4,targetRotX));prevMouse={x:ex,y:ey};}
  function endDrag(){isDragging=false;autoTimer=setTimeout(()=>autoRotate=true,3000);}

  canvas.addEventListener('mousedown',e=>startDrag(e.clientX,e.clientY));
  canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;moveDrag(e.clientX,e.clientY);});
  canvas.addEventListener('mouseup',endDrag);
  canvas.addEventListener('mouseleave',()=>{endDrag();resetHover();mouse.set(-5,-5);});
  canvas.addEventListener('touchstart',e=>{const t=e.touches[0];startDrag(t.clientX,t.clientY);},{passive:true});
  canvas.addEventListener('touchmove',e=>{const t=e.touches[0];moveDrag(t.clientX,t.clientY);},{passive:true});
  canvas.addEventListener('touchend',endDrag);

  function resetHover(){
    if(headMesh && headMesh.material !== originalMaterial) headMesh.material = originalMaterial;
    if(infoBox) infoBox.classList.remove('visible');
    document.querySelectorAll('.pricing-card').forEach(c=>c.classList.remove('active'));
    canvas.style.cursor='grab';
    prevZone=null;
  }

  function syncCard(zone){
    document.querySelectorAll('.pricing-card').forEach(c=>c.classList.remove('active'));
    if(zone){const card=document.querySelector(`.pricing-card[data-zone="${zone}"]`);if(card)card.classList.add('active');}
  }

  // Pricing card hover sync
  document.querySelectorAll('.pricing-card').forEach(card=>{
    card.addEventListener('mouseenter',()=>{if(headMesh&&(card.dataset.zone==='density'||card.dataset.zone==='crown'))headMesh.material=hoverMat;});
    card.addEventListener('mouseleave',()=>{if(headMesh)headMesh.material=originalMaterial;});
  });

  function animate(){
    requestAnimationFrame(animate);
    if(autoRotate)targetRotY+=0.002;
    rotY+=(targetRotY-rotY)*0.06;
    rotX+=(targetRotX-rotX)*0.06;
    headGroup.rotation.y=rotY;
    headGroup.rotation.x=rotX;

    if(!isDragging && headMesh){
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(zoneMeshes);
      if(hits.length>0){
        const hit=hits[0].object;
        if(hit.userData.title){
          if(prevZone!==hit){
            resetHover();
            prevZone=hit;
            headMesh.material=hoverMat;
            if(infoBox){
              const lang=localStorage.getItem('scalpcare-lang')||'fr';
              infoBox.querySelector('h4').textContent=lang==='es'&&hit.userData.titleES?hit.userData.titleES:hit.userData.title;
              infoBox.querySelector('.price').textContent=hit.userData.price;
              infoBox.classList.add('visible');
            }
            syncCard(hit.userData.zone);
            canvas.style.cursor='pointer';
          }
        }else{if(prevZone)resetHover();}
      }else{if(prevZone)resetHover();}
    }
    renderer.render(scene,camera);
  }
  animate();

  window.addEventListener('resize',()=>{
    const w=container.clientWidth,h=container.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });
}

document.addEventListener('DOMContentLoaded',initHead3D);
