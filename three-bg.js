// Three.js Background Animation - RED Protocol
let updateVisualStateGlobal;

function initThree() {
    const canvas = document.querySelector('#three-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;

    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Initial Material State (Active/Red)
    const targetColor = new THREE.Color('#ff0000');
    const standbyColor = new THREE.Color('#4a90e2'); // Blueish

    const material = new THREE.PointsMaterial({
        size: 0.012,
        color: targetColor,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, material);
    scene.add(particlesMesh);

    camera.position.z = 2;

    let mouseX = 0;
    let mouseY = 0;
    let targetSpeed = 0.002;
    let currentSpeed = 0.002;
    let isStandby = false;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) - 0.5;
        mouseY = (event.clientY / window.innerHeight) - 0.5;
    });

    // Exposed function to update state
    updateVisualStateGlobal = function (isActive) {
        isStandby = !isActive;
        if (isActive) {
            targetSpeed = 0.002; // Fast
        } else {
            targetSpeed = 0.0005; // Slow
        }
    };

    function animate() {
        requestAnimationFrame(animate);

        // Lerp speed
        currentSpeed += (targetSpeed - currentSpeed) * 0.05;

        // Lerp color
        const target = isStandby ? standbyColor : targetColor;
        material.color.lerp(target, 0.05);

        particlesMesh.rotation.y += currentSpeed;
        particlesMesh.rotation.x += currentSpeed * 0.5;

        // Influence by mouse
        particlesMesh.rotation.y += mouseX * 0.1;
        particlesMesh.rotation.x += -mouseY * 0.1;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

document.addEventListener('DOMContentLoaded', initThree);

// Allow external access if loaded
window.updateVisualState = function (isActive) {
    if (updateVisualStateGlobal) updateVisualStateGlobal(isActive);
};
