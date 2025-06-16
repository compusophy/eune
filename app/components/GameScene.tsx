'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import type * as ThreeType from 'three';
import * as THREE from 'three';
import { sdk } from '@farcaster/frame-sdk';

export const GameScene = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: ThreeType.WebGLRenderer | null;
        scene: ThreeType.Scene | null;
        camera: ThreeType.Camera | null;
        cleanup: (() => void) | null;
        playerMeshes: Map<string, ThreeType.Mesh>;
        marker: ThreeType.Mesh | null;
    }>({
        renderer: null,
        scene: null,
        camera: null,
        cleanup: null,
        playerMeshes: new Map(),
        marker: null
    });
    const { sendMessage, players, clientId } = useWebSocket();
    const localMovementRef = useRef(false);
    const [isSceneReady, setSceneReady] = useState(false);
    
    // Announce ready on component mount
    useEffect(() => {
        sdk.actions.ready();
    }, []);

    // Update player positions
    useEffect(() => {
        if (!isSceneReady || !clientId) return;

        players.forEach((player, id) => {
            const mesh = sceneRef.current.playerMeshes.get(id);
            if (mesh) {
                if (id === clientId && localMovementRef.current) return;
                mesh.position.set(player.position.x, player.position.y, player.position.z);
            }
        });
    }, [players, clientId, isSceneReady]);

    // Manage player meshes (add/remove)
    useEffect(() => {
        if (!isSceneReady) return;

        const { scene } = sceneRef.current;
        if (!scene || !clientId) return;

        const currentIds = new Set(sceneRef.current.playerMeshes.keys());
        const serverIds = new Set(players.keys());

        // Add new players
        for (const id of serverIds) {
            if (!currentIds.has(id)) {
                const player = players.get(id)!;
                const isLocalPlayer = id === clientId;
                const material = new THREE.MeshPhongMaterial({ color: isLocalPlayer ? 0x0000ff : 0xff0000 });
                const ball = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5),
                    material
                );
                ball.position.set(player.position.x, player.position.y, player.position.z);
                scene.add(ball);
                sceneRef.current.playerMeshes.set(id, ball);
            }
        }

        // Remove disconnected players
        for (const id of currentIds) {
            if (!serverIds.has(id)) {
                const mesh = sceneRef.current.playerMeshes.get(id);
                if (mesh) {
                    scene.remove(mesh);
                    mesh.geometry.dispose();
                    (mesh.material as ThreeType.Material).dispose();
                    sceneRef.current.playerMeshes.delete(id);
                }
            }
        }
    }, [players, clientId, isSceneReady]);


    // Setup and handle scene
    useEffect(() => {
        if (typeof window === 'undefined' || !clientId) return;

        if (sceneRef.current.cleanup) {
            sceneRef.current.cleanup();
        }

        let isActive = true;

        const initScene = async () => {
            if (!isActive || !containerRef.current) return;

            console.log('Initializing scene for client:', clientId);

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);
            sceneRef.current.scene = scene;

            const WIDTH = containerRef.current.clientWidth;
            const HEIGHT = containerRef.current.clientHeight;

            const camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 1000);
            camera.position.set(0, 15, 15);
            camera.lookAt(0, 0, 0);
            sceneRef.current.camera = camera;

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(WIDTH, HEIGHT);
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(renderer.domElement);
            sceneRef.current.renderer = renderer;

            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(20, 20),
                new THREE.MeshPhongMaterial({ 
                    color: 0x90EE90,
                    side: THREE.DoubleSide
                })
            );
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = 0;
            scene.add(plane);

            const grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
            scene.add(grid);

            const marker = new THREE.Mesh(
                new THREE.CircleGeometry(0.3, 32),
                new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5
                })
            );
            marker.rotation.x = -Math.PI / 2;
            marker.position.y = 0.01;
            marker.visible = false;
            scene.add(marker);
            sceneRef.current.marker = marker;

            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 10, 0);
            scene.add(light);
            scene.add(new THREE.AmbientLight(0x404040));

            setSceneReady(true);

            const clock = new THREE.Clock();
            let targetPos: ThreeType.Vector3 | null = null;
            const moveSpeed = 4;

            const handleClick = (event: MouseEvent | TouchEvent) => {
                event.preventDefault();

                if (!sceneRef.current.renderer || !sceneRef.current.camera) return;
                
                const rect = sceneRef.current.renderer.domElement.getBoundingClientRect();
                const x = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
                const y = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

                const mouse = new THREE.Vector2();
                mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, sceneRef.current.camera);

                const intersects = raycaster.intersectObjects([plane, grid]);
                
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    
                    targetPos = new THREE.Vector3(
                        Math.round(point.x),
                        0.5,
                        Math.round(point.z)
                    );
                    
                    if (sceneRef.current.marker) {
                        sceneRef.current.marker.position.set(targetPos.x, 0.01, targetPos.z);
                        sceneRef.current.marker.visible = true;
                    }
                    
                    localMovementRef.current = true;
                }
            };

            let animationFrameId: number;
            const animate = () => {
                if (!isActive) return;
                
                animationFrameId = requestAnimationFrame(animate);

                const deltaTime = clock.getDelta();
                const localPlayerMesh = sceneRef.current.playerMeshes.get(clientId);

                if (targetPos && localPlayerMesh && localMovementRef.current) {
                    const direction = new THREE.Vector3().subVectors(targetPos, localPlayerMesh.position);
                    
                    if (direction.length() > 0.1) {
                        direction.normalize();
                        localPlayerMesh.position.add(direction.multiplyScalar(moveSpeed * deltaTime));
                        
                        sendMessage({
                            type: 'position',
                            position: {
                                x: localPlayerMesh.position.x,
                                y: localPlayerMesh.position.y,
                                z: localPlayerMesh.position.z,
                            }
                        });
                    } else {
                        targetPos = null;
                        if (sceneRef.current.marker) {
                            sceneRef.current.marker.visible = false;
                        }
                        localMovementRef.current = false;
                    }
                }

                renderer.render(scene, camera);
            };

            animate();

            const handleResize = () => {
                if (!isActive || !containerRef.current || !sceneRef.current.renderer || !sceneRef.current.camera) return;
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;

                sceneRef.current.renderer.setSize(width, height);
                
                const cam = sceneRef.current.camera as ThreeType.PerspectiveCamera;
                cam.aspect = width / height;
                cam.updateProjectionMatrix();
            };

            window.addEventListener('resize', handleResize);

            const canvas = renderer.domElement;
            canvas.addEventListener('click', handleClick);
            canvas.addEventListener('touchstart', handleClick, { passive: false });

            sceneRef.current.cleanup = () => {
                console.log('Cleaning up scene...');
                isActive = false;
                setSceneReady(false);
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener('resize', handleResize);
                canvas.removeEventListener('click', handleClick);
                canvas.removeEventListener('touchstart', handleClick);
                
                sceneRef.current.playerMeshes.forEach(mesh => {
                    if (sceneRef.current.scene) {
                        sceneRef.current.scene.remove(mesh);
                    }
                    mesh.geometry.dispose();
                    (mesh.material as ThreeType.Material).dispose();
                });
                sceneRef.current.playerMeshes.clear();

                if (sceneRef.current.renderer) {
                    sceneRef.current.renderer.dispose();
                }
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
                sceneRef.current.renderer = null;
                sceneRef.current.scene = null;
                sceneRef.current.camera = null;
                sceneRef.current.cleanup = null;
                sceneRef.current.marker = null;
                localMovementRef.current = false;
            };
        };

        initScene();

        return () => {
            if (sceneRef.current.cleanup) {
                sceneRef.current.cleanup();
            }
        };
    }, [sendMessage, clientId]);

    return (
        <div 
            ref={containerRef} 
            style={{
                width: '100vw',
                height: '100vh',
                display: 'block'
            }}
        />
    );
}; 