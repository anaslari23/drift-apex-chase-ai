
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { CameraMode } from '@/utils/Camera';

// Car model component
const CarModel = ({ position, rotation, color, isPlayerCar }: { 
  position: [number, number, number], 
  rotation: number, 
  color: string,
  isPlayerCar: boolean
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  // Basic car model with improved graphics
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Car body */}
      <mesh ref={mesh} castShadow receiveShadow>
        <boxGeometry args={[4, 1.2, 8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Car cabin */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[3, 1, 4]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} opacity={0.8} transparent />
      </mesh>
      
      {/* Wheels */}
      <Wheel position={[-2, -0.5, 2.5]} />
      <Wheel position={[2, -0.5, 2.5]} />
      <Wheel position={[-2, -0.5, -2.5]} />
      <Wheel position={[2, -0.5, -2.5]} />
      
      {/* Headlights */}
      <mesh position={[1.5, 0, 4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#FFFF99" emissive="#FFFF00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-1.5, 0, 4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#FFFF99" emissive="#FFFF00" emissiveIntensity={2} />
      </mesh>
      
      {/* Taillights */}
      <mesh position={[1.5, 0, -4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-1.5, 0, -4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={2} />
      </mesh>
      
      {/* Drift effect */}
      {isPlayerCar && (
        <mesh position={[0, -0.6, -3]} rotation={[0, 0, 0]}>
          <planeGeometry args={[5, 10]} />
          <meshStandardMaterial 
            color="#D946EF" 
            transparent 
            opacity={0.4} 
            emissive="#D946EF" 
            emissiveIntensity={0.5} 
          />
        </mesh>
      )}
    </group>
  );
};

// Wheel component
const Wheel = ({ position }: { position: [number, number, number] }) => {
  return (
    <mesh position={position} castShadow receiveShadow>
      {/* Fixed: Removed 'rotation' from cylinderGeometry props and moved it to the mesh */}
      <cylinderGeometry args={[0.8, 0.8, 0.5, 32]} />
      <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.7} />
    </mesh>
  );
};

// Track model
const TrackModel = ({ track }: { track: Track }) => {
  // Create a 3D representation of the track
  return (
    <group>
      {/* Track surface */}
      <mesh position={[0, -1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[track.width, track.height]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      
      {/* Track boundaries - Fix: Use barriers instead of boundaries */}
      {track.barriers.map((barrier, index) => (
        <mesh 
          key={index} 
          position={[(barrier.x1 + barrier.x2) / 2, 0, (barrier.y1 + barrier.y2) / 2]} 
          castShadow
        >
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.2} />
        </mesh>
      ))}
      
      {/* Checkpoints */}
      {track.checkpoints.map((checkpoint, index) => (
        <mesh 
          key={`checkpoint-${index}`} 
          position={[checkpoint.x, 0, checkpoint.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[8, 10, 32]} />
          <meshStandardMaterial 
            color={index === 0 ? "#00FF00" : "#FFFFFF"} 
            side={THREE.DoubleSide} 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      ))}
    </group>
  );
};

// Environment elements
const Environment3D = () => {
  return (
    <>
      {/* Sky */}
      <color attach="background" args={['#87CEEB']} />
      
      {/* Directional light (sun) */}
      <directionalLight 
        position={[100, 100, 100]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
      />
      
      {/* Ambient light */}
      <ambientLight intensity={0.4} />
      
      {/* Ground */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#358c36" />
      </mesh>
      
      {/* Mountains in the distance */}
      <group position={[0, 0, -200]}>
        <mesh position={[-100, 30, 0]} castShadow>
          <coneGeometry args={[50, 100, 32]} />
          <meshStandardMaterial color="#6d6d6d" />
        </mesh>
        <mesh position={[0, 40, -50]} castShadow>
          <coneGeometry args={[60, 120, 32]} />
          <meshStandardMaterial color="#5d5d5d" />
        </mesh>
        <mesh position={[120, 35, 0]} castShadow>
          <coneGeometry args={[55, 110, 32]} />
          <meshStandardMaterial color="#6d6d6d" />
        </mesh>
      </group>
      
      {/* Trees */}
      <Trees />
    </>
  );
};

// Trees component
const Trees = () => {
  const positions = [
    [-80, 0, -80],
    [80, 0, -80],
    [-80, 0, 80],
    [80, 0, 80],
    [-120, 0, 0],
    [120, 0, 0],
    [0, 0, -120],
    [0, 0, 120]
  ];
  
  return (
    <>
      {positions.map((position, index) => (
        <Tree key={index} position={position as [number, number, number]} />
      ))}
    </>
  );
};

// Individual tree
const Tree = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[1, 1, 10, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Foliage */}
      <mesh position={[0, 12, 0]} castShadow>
        <coneGeometry args={[6, 15, 16]} />
        <meshStandardMaterial color="#2E8B57" />
      </mesh>
    </group>
  );
};

// Camera controller
const CameraController = ({ 
  playerCar, 
  cameraMode,
  cameraPosition
}: { 
  playerCar: Car, 
  cameraMode: CameraMode,
  cameraPosition: { x: number, y: number }
}) => {
  const { camera } = useThree();
  const controls = useRef<any>();
  
  useFrame(() => {
    if (!playerCar) return;
    
    const carPosX = playerCar.x;
    const carPosZ = playerCar.y; // In 3D, y from 2D becomes z
    const carAngle = playerCar.angle;
    
    // Set camera position based on mode
    switch (cameraMode) {
      case 'follow':
        camera.position.x = carPosX;
        camera.position.y = 15;
        camera.position.z = carPosZ + 20;
        camera.lookAt(carPosX, 0, carPosZ);
        break;
        
      case 'chase':
        const distance = 25;
        camera.position.x = carPosX - Math.sin(carAngle) * distance;
        camera.position.y = 10;
        camera.position.z = carPosZ + Math.cos(carAngle) * distance;
        camera.lookAt(carPosX, 3, carPosZ);
        break;
        
      case 'overhead':
        camera.position.x = carPosX;
        camera.position.y = 50;
        camera.position.z = carPosZ;
        camera.lookAt(carPosX, 0, carPosZ);
        break;
        
      case 'cinematic':
        // Cinematic mode uses a combination of positions
        const time = Date.now() * 0.001;
        camera.position.x = carPosX + Math.sin(time * 0.3) * 30;
        camera.position.y = 10 + Math.sin(time * 0.2) * 5;
        camera.position.z = carPosZ + Math.cos(time * 0.3) * 30;
        camera.lookAt(carPosX, 3, carPosZ);
        break;
        
      case 'fixed':
        camera.position.x = cameraPosition.x;
        camera.position.y = 30;
        camera.position.z = cameraPosition.y; // y becomes z in 3D
        camera.lookAt(carPosX, 0, carPosZ);
        break;
    }
  });
  
  return (
    <OrbitControls 
      ref={controls} 
      enabled={false} // Disable user control of the camera
    />
  );
};

// Main 3D game component
export const Game3DRenderer = ({
  playerCar,
  aiCar,
  track,
  cameraMode,
  cameraPosition
}: {
  playerCar: Car | null,
  aiCar: Car | null,
  track: Track | null,
  cameraMode: CameraMode,
  cameraPosition: { x: number, y: number }
}) => {
  if (!playerCar || !aiCar || !track) return null;
  
  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[0, 20, 50]} fov={60} />
      
      <CameraController 
        playerCar={playerCar} 
        cameraMode={cameraMode} 
        cameraPosition={cameraPosition}
      />
      
      {/* Player car */}
      <CarModel 
        position={[playerCar.x, 0, playerCar.y]} 
        rotation={playerCar.angle} 
        color="#8B5CF6"
        isPlayerCar={true}
      />
      
      {/* AI car */}
      <CarModel 
        position={[aiCar.x, 0, aiCar.y]} 
        rotation={aiCar.angle} 
        color="#F97316"
        isPlayerCar={false}
      />
      
      {/* Track */}
      <TrackModel track={track} />
      
      {/* Environment */}
      <Environment3D />
    </Canvas>
  );
};

export default Game3DRenderer;
