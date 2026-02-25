"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Stars } from "@react-three/drei";
import { useTheme } from "next-themes";

const AnimatedSphere = ({ color, position, distort, speed }: any) => {
    const meshRef = useRef<any>(null);

    useFrame((state, delta) => {
        meshRef.current.rotation.x += delta * 0.2;
        meshRef.current.rotation.y += delta * 0.3;
    });

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]} position={position} scale={2}>
            <MeshDistortMaterial
                color={color}
                envMapIntensity={1}
                clearcoat={1}
                clearcoatRoughness={0.1}
                metalness={0.5}
                roughness={0.2}
                distort={distort}
                speed={speed}
            />
        </Sphere>
    );
};

export default function Background3D() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark" || !resolvedTheme;

    return (
        <div className="absolute inset-0 -z-10 h-full w-full pointer-events-none">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={isDark ? 0.3 : 0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#06b6d4" />

                {isDark && (
                    <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                )}

                <group position={[0, 0, -2]}>
                    <AnimatedSphere
                        color={isDark ? "#0ea5e9" : "#38bdf8"}
                        position={[-3, 1, -1]}
                        distort={0.4}
                        speed={2}
                    />
                    <AnimatedSphere
                        color={isDark ? "#06b6d4" : "#22d3ee"}
                        position={[3, -1, -2]}
                        distort={0.6}
                        speed={3}
                    />
                </group>
            </Canvas>
        </div>
    );
}
