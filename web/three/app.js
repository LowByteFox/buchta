import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#bg")
});

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);


function addStar() {
    const geometry = new THREE.SphereGeometry(0.25, 24, 24);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);
  
    const [x, y, z] = Array(3)
      .fill()
      .map(() => THREE.MathUtils.randFloatSpread(100));
  
    star.position.set(x, y, z);
    scene.add(star);
}

Array(200).fill().forEach(addStar);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

const buchtaTexture = new THREE.TextureLoader().load('/buchta.png');

const buchta = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshBasicMaterial({map: buchtaTexture }));

scene.add(buchta);

const buchtaX = THREE.MathUtils.randFloatSpread(0.1);
const buchtaY = THREE.MathUtils.randFloatSpread(0.1);

function animate () {
    requestAnimationFrame(animate);
    buchta.rotation.x += buchtaX;
    buchta.rotation.y += buchtaY;
    renderer.render(scene, camera);
}

animate();