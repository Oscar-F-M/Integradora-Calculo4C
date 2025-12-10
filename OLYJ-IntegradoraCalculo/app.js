const shapesConfig = {
  cilindro: {
    nombre: "Cilindro",
    formula: "V = π · r² · h",
    campos: [
      { id: "radio", label: "Radio (r)", hint: "≥ 0", min: 0 },
      { id: "altura", label: "Altura (h)", hint: "≥ 0", min: 0 }
    ],
    calcular: ({ radio, altura }) => Math.PI * Math.pow(radio, 2) * altura
  },
  esfera: {
    nombre: "Esfera",
    formula: "V = 4/3 · π · r³",
    campos: [
      { id: "radio", label: "Radio (r)", hint: "≥ 0", min: 0 }
    ],
    calcular: ({ radio }) => (4 / 3) * Math.PI * Math.pow(radio, 3)
  },
  cono: {
    nombre: "Cono",
    formula: "V = (1/3) · π · r² · h",
    campos: [
      { id: "radio", label: "Radio (r)", hint: "≥ 0", min: 0 },
      { id: "altura", label: "Altura (h)", hint: "≥ 0", min: 0 }
    ],
    calcular: ({ radio, altura }) => (1 / 3) * Math.PI * Math.pow(radio, 2) * altura
  },
  prisma: {
    nombre: "Prisma rectangular",
    formula: "V = l · a · h",
    campos: [
      { id: "largo", label: "Largo (l)", hint: "≥ 0", min: 0 },
      { id: "ancho", label: "Ancho (a)", hint: "≥ 0", min: 0 },
      { id: "altura", label: "Altura (h)", hint: "≥ 0", min: 0 }
    ],
    calcular: ({ largo, ancho, altura }) => largo * ancho * altura
  },
  elipsoide: {
    nombre: "Elipsoide",
    formula: "V = 4/3 · π · a · b · c",
    campos: [
      { id: "a", label: "Semieje (a)", hint: "≥ 0", min: 0 },
      { id: "b", label: "Semieje (b)", hint: "≥ 0", min: 0 },
      { id: "c", label: "Semieje (c)", hint: "≥ 0", min: 0 }
    ],
    calcular: ({ a, b, c }) => (4 / 3) * Math.PI * a * b * c
  }
};

const shapeSelect = document.getElementById("shapeSelect");
const inputsContainer = document.getElementById("inputsContainer");
const calcBtn = document.getElementById("calcBtn");
const resultBox = document.getElementById("resultBox");
const formulaBox = document.getElementById("formulaBox");
const errorBox = document.getElementById("errorBox");

// elementos para animaciones
const currentFigureChip = document.getElementById("currentFigure");
const viewerContainer = document.getElementById("viewer");

let figuraActiva = "cilindro";

/**
 * Utilidad para reiniciar una animación CSS
 */
function restartAnimation(element, className) {
  if (!element) return;
  element.classList.remove(className);
  // forzar reflow para que el navegador "reinicie" la animación
  void element.offsetWidth;
  element.classList.add(className);
}

/**
 * Actualiza el chip de figura actual y el flash del visor
 */
function updateFigureUI() {
  const config = shapesConfig[figuraActiva];
  if (currentFigureChip && config) {
    currentFigureChip.textContent = config.nombre;
    restartAnimation(currentFigureChip, "animate");
  }
  if (viewerContainer) {
    restartAnimation(viewerContainer, "flash");
  }
}

// ========= Generar inputs según figura =========
function renderInputs() {
  const config = shapesConfig[figuraActiva];
  inputsContainer.innerHTML = "";

  config.campos.forEach(campo => {
    const div = document.createElement("div");
    div.className = "field";
    div.innerHTML = `
      <label for="${campo.id}">${campo.label}</label>
      <input type="number" id="${campo.id}" min="${campo.min}" step="any" />
      <small>${campo.hint}</small>
    `;
    inputsContainer.appendChild(div);
  });

  formulaBox.textContent = "Fórmula: " + config.formula;
  errorBox.style.display = "none";
  errorBox.textContent = "";
  resultBox.innerHTML = 'Volumen: <strong>—</strong> unidades³';

  updateFigureUI();   // actualizar chip + animación
  update3DShape();    // actualizar figura 3D
}

shapeSelect.addEventListener("change", () => {
  figuraActiva = shapeSelect.value;
  renderInputs();
});

// ========= Cálculo del volumen =========
function calcularVolumen() {
  const config = shapesConfig[figuraActiva];
  const datos = {};
  let hayError = false;
  let camposInvalidos = [];

  config.campos.forEach(campo => {
    const input = document.getElementById(campo.id);
    const valor = parseFloat(input.value);

    if (isNaN(valor) || valor < 0) {
      hayError = true;
      camposInvalidos.push(campo.label);
    } else {
      datos[campo.id] = valor;
    }
  });

  if (hayError) {
    errorBox.style.display = "block";
    errorBox.textContent = "Revisa estos campos: " + camposInvalidos.join(", ") + ".";
    resultBox.innerHTML = 'Volumen: <strong>—</strong> unidades³';
  } else {
    errorBox.style.display = "none";
    const V = config.calcular(datos);
    const Vr = Math.round(V * 1000) / 1000;
    resultBox.innerHTML = 'Volumen: <strong>' + Vr.toLocaleString("es-MX") + '</strong> unidades³';
  }

  update3DShape();
  updateFigureUI();   // también animamos cuando calculan
}

calcBtn.addEventListener("click", calcularVolumen);

// ========= THREE.JS: escena sencilla 3D =========
const viewer = document.getElementById("viewer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);

const camera = new THREE.PerspectiveCamera(
  45,
  viewer.clientWidth / viewer.clientHeight,
  0.1,
  1000
);
camera.position.set(4, 4, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
viewer.appendChild(renderer.domElement);

// Luz
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Suelo / grid sencillo
const grid = new THREE.GridHelper(10, 10, 0x16a34a, 0x16a34a);
grid.position.y = -2;
scene.add(grid);

let currentMesh = null;

// Función auxiliar para leer valores (con valor default si está vacío)
function getValue(id, def) {
  const el = document.getElementById(id);
  if (!el) return def;
  const v = parseFloat(el.value);
  if (isNaN(v) || v <= 0) return def;
  return v;
}

// Crear o actualizar la figura en 3D
function update3DShape() {
  // Quitar la figura anterior
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    metalness: 0.2,
    roughness: 0.35
  });

  let geometry;
  let mesh;
  let dims = { x: 1, y: 1, z: 1 }; // para escalar

  if (figuraActiva === "cilindro") {
    const r = getValue("radio", 1);
    const h = getValue("altura", 2);
    geometry = new THREE.CylinderGeometry(r, r, h, 32);
    dims = { x: r * 2, y: h, z: r * 2 };
    mesh = new THREE.Mesh(geometry, material);
  } else if (figuraActiva === "esfera") {
    const r = getValue("radio", 1.5);
    geometry = new THREE.SphereGeometry(r, 32, 16);
    dims = { x: r * 2, y: r * 2, z: r * 2 };
    mesh = new THREE.Mesh(geometry, material);
  } else if (figuraActiva === "cono") {
    const r = getValue("radio", 1);
    const h = getValue("altura", 2.5);
    geometry = new THREE.ConeGeometry(r, h, 32);
    dims = { x: r * 2, y: h, z: r * 2 };
    mesh = new THREE.Mesh(geometry, material);
  } else if (figuraActiva === "prisma") {
    const l = getValue("largo", 2);
    const a = getValue("ancho", 1.5);
    const h = getValue("altura", 2.5);
    geometry = new THREE.BoxGeometry(l, h, a);
    dims = { x: l, y: h, z: a };
    mesh = new THREE.Mesh(geometry, material);
  } else if (figuraActiva === "elipsoide") {
    const a = getValue("a", 1.5);
    const b = getValue("b", 1);
    const c = getValue("c", 2);
    geometry = new THREE.SphereGeometry(1, 32, 16); // esfera base
    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(a, b, c);
    dims = { x: a * 2, y: b * 2, z: c * 2 };
  }

  // Escalar todo para que no se salga de la pantalla
  const maxDim = Math.max(dims.x, dims.y, dims.z);
  const desired = 3; // tamaño objetivo en la escena
  const scaleFactor = maxDim > 0 ? desired / maxDim : 1;
  mesh.scale.multiplyScalar(scaleFactor);

  mesh.position.y = 0; // centrado
  currentMesh = mesh;
  scene.add(currentMesh);
}

// Animación simple: girar la figura
function animate() {
  requestAnimationFrame(animate);
  if (currentMesh) {
    currentMesh.rotation.y += 0.01;
    currentMesh.rotation.x += 0.003;
  }
  renderer.render(scene, camera);
}
animate();

// Redimensionar al cambiar tamaño de ventana
window.addEventListener("resize", () => {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Inicializar todo
renderInputs();
