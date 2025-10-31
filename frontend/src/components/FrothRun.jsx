import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { convertImageURI } from '../lib/imageUtils';
import { saveGameScore } from '../lib/mongodb';
import { PlayCircle } from 'lucide-react';

export default function FrothRun({ petData, onGameEnd, onRestart, energyCost, fullscreen = false }) {
  // onGameEnd callback signature: (score: number, shouldResetEnergyFlag?: boolean) => void
  // fullscreen: if true, hide extra info and make game fullscreen
  const { address } = useAccount();
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Game state
  const petY = useRef(200); // Ground position
  const petVelocity = useRef(0);
  const isJumping = useRef(false);
  const obstacles = useRef([]);
  const flyingFireballs = useRef([]); // Flying fireballs that move towards player
  const clouds = useRef([]);
  const gameSpeed = useRef(10); // Increased base speed from 6 to 10
  const frameCount = useRef(0);
  const lastFlyingFireballSpawn = useRef(0); // Track last spawn time for flying fireballs
  const groundY = useRef(0); // Will be calculated based on canvas height

  // Pet dimensions
  const petWidth = 60;
  const petHeight = 60;
  const petX = 80;

  // Obstacle dimensions
  const obstacleWidth = 45;
  const obstacleHeight = 55;
  
  // Obstacle types: 'rock', 'spike', 'fireball'
  const getObstacleType = (score) => {
    const level = Math.floor(score / 20);
    // More variety - spike appears earlier and more often
    if (level >= 3 && Math.random() < 0.4) return 'fireball'; // 40% chance for fireball after score 60
    if (level >= 1 && Math.random() < 0.4) return 'spike'; // 40% chance for spike after score 20 (earlier!)
    if (level >= 0 && Math.random() < 0.3) return 'spike'; // 30% chance even at start
    return 'rock'; // Default
  };
  
  // Spawn flying fireball projectile - will be called inside gameLoop with score parameter

  // Jump physics
  const gravity = 0.85;
  const jumpPower = -16;

  // Get pet image
  const petImageSrc = petData ? convertImageURI(petData.imageURI, petData.tier) : null;

  // Handle jump
  const handleJump = useCallback(() => {
    if (!isJumping.current && !gameOver) {
      isJumping.current = true;
      petVelocity.current = jumpPower;
    }
  }, [gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleJump]);

  // Touch controls
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    handleJump();
  }, [handleJump]);

  // Load pet image
  const petImgRef = useRef(null);
  const imageLoadedRef = useRef(false);

  useEffect(() => {
    if (petImageSrc) {
      const img = new Image();
      img.onload = () => {
        imageLoadedRef.current = true;
      };
      img.onerror = () => {
        imageLoadedRef.current = false;
      };
      img.src = petImageSrc;
      petImgRef.current = img;
    }
  }, [petImageSrc]);

  // Game loop
  useEffect(() => {
    if (!canvasRef.current || gameOver || isPaused) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Initialize canvas size
    const setCanvasSize = () => {
      if (fullscreen) {
        // Fullscreen mode - use full window
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        // Normal mode - fixed size
        const container = canvas.parentElement;
        if (container) {
          canvas.width = Math.min(800, container.clientWidth - 32);
          canvas.height = 300;
        } else {
          canvas.width = 800;
          canvas.height = 300;
        }
      }
    };
    
    setCanvasSize();
    // Calculate ground position based on canvas height
    // Place ground higher to avoid navbar at bottom
    // Navbar is approximately 70-80px tall, reserve extra space for visibility
    if (fullscreen) {
      // In fullscreen mode, place ground much higher to avoid bottom navbar
      // Account for navbar height (~80px) + extra spacing (~100px) = 180px from bottom
      groundY.current = canvas.height - 180;
    } else {
      // In normal mode, also account for navbar
      groundY.current = canvas.height - 130;
    }
    // Initialize pet position to ground level
    // petY.current is top-left corner, pet bottom should be at groundY.current
    // So petY.current = groundY.current - petHeight
    if (petY.current === 200 || petY.current > groundY.current - petHeight) {
      petY.current = groundY.current - petHeight;
    }
    
    // Initialize clouds
    if (clouds.current.length === 0) {
      for (let i = 0; i < 5; i++) {
        clouds.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * (groundY.current * 0.4) + 20,
          width: 60 + Math.random() * 40,
          height: 30 + Math.random() * 20,
          speed: 0.5 + Math.random() * 0.5,
        });
      }
    }
    
    const resizeHandler = () => {
      setCanvasSize();
      // Recalculate ground position on resize
      if (fullscreen) {
        groundY.current = canvas.height - 180; // Higher from bottom in fullscreen (accounts for navbar)
      } else {
        groundY.current = canvas.height - 130;
      }
      // Ensure pet doesn't go below ground
      // Pet bottom (petY.current + petHeight) should be at groundY.current
      if (petY.current + petHeight > groundY.current) {
        petY.current = groundY.current - petHeight;
        petVelocity.current = 0;
        isJumping.current = false;
      }
    };
    window.addEventListener('resize', resizeHandler);

    const drawCloud = (x, y, width, height) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      // Draw cloud as multiple circles
      ctx.beginPath();
      ctx.arc(x + width * 0.3, y + height * 0.5, height * 0.4, 0, Math.PI * 2);
      ctx.arc(x + width * 0.5, y + height * 0.3, height * 0.45, 0, Math.PI * 2);
      ctx.arc(x + width * 0.7, y + height * 0.5, height * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawGroundTexture = (y, width, height) => {
      // Ground base
      const gradient = ctx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, '#9B7653');
      gradient.addColorStop(0.5, '#8B6F47');
      gradient.addColorStop(1, '#7A5E3D');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, height);

      // Ground texture lines
      ctx.strokeStyle = '#6B5130';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, y + (i * height / 20));
        ctx.lineTo(width, y + (i * height / 20));
        ctx.stroke();
      }

      // Top ground line (shadow)
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    };

    const gameLoop = () => {
      if (gameOver || isPaused) return;

      // Clear canvas with sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, '#87CEEB'); // Light blue
      skyGradient.addColorStop(0.6, '#98D8E8'); // Lighter blue
      skyGradient.addColorStop(1, '#B8E6E6'); // Very light blue
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw clouds (parallax effect)
      clouds.current.forEach((cloud, index) => {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.width < 0) {
          cloud.x = canvas.width + Math.random() * 200;
          cloud.y = Math.random() * (groundY.current * 0.4) + 20;
        }
        drawCloud(cloud.x, cloud.y, cloud.width, cloud.height);
      });

      // Draw ground with texture
      const groundHeight = canvas.height - groundY.current;
      drawGroundTexture(groundY.current, canvas.width, groundHeight);

      // Update pet position (jump physics)
      if (isJumping.current) {
        petVelocity.current += gravity;
        petY.current += petVelocity.current;

        // Landing
        // Pet bottom (petY.current + petHeight) should not go below groundY.current
        if (petY.current + petHeight >= groundY.current) {
          petY.current = groundY.current - petHeight;
          petVelocity.current = 0;
          isJumping.current = false;
        }
      }

      // Draw pet shadow
      const shadowY = groundY.current + 5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(petX + petWidth / 2, shadowY, petWidth * 0.4, petWidth * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw pet
      const petImg = petImgRef.current;
      if (imageLoadedRef.current && petImg && petImg.complete && petImg.naturalHeight !== 0) {
        try {
          // Draw pet image with slight rotation when jumping
          if (isJumping.current && petVelocity.current < -5) {
            ctx.save();
            ctx.translate(petX + petWidth / 2, petY.current + petHeight / 2);
            ctx.rotate(-0.2);
            ctx.drawImage(petImg, -petWidth / 2, -petHeight / 2, petWidth, petHeight);
            ctx.restore();
          } else {
            ctx.drawImage(petImg, petX, petY.current, petWidth, petHeight);
          }
        } catch (e) {
          // Fallback if image fails to draw
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(petX, petY.current, petWidth, petHeight);
          ctx.fillStyle = '#fff';
          ctx.font = '24px Arial';
          ctx.fillText('🐱', petX + 15, petY.current + 40);
        }
      } else {
        // Fallback: draw pet character with better styling
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(petX, petY.current, petWidth, petHeight);
        ctx.strokeStyle = '#2d7a2d';
        ctx.lineWidth = 2;
        ctx.strokeRect(petX, petY.current, petWidth, petHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('🐱', petX + 15, petY.current + 40);
      }

      // Spawn obstacles (adaptive spawn rate with random spacing)
      frameCount.current++;
      const level = Math.floor(score / 20); // Level increases every 20 points
      
      // Variable spawn rate - sometimes close together, sometimes far apart
      const baseSpawnRate = 100;
      const scoreBonus = level * 15;
      const speedBonus = Math.floor((gameSpeed.current - 10) / 2) * 10;
      const minSpawnRate = Math.max(20, baseSpawnRate - scoreBonus - speedBonus);
      
      // Random spacing: sometimes very close (tight), sometimes normal
      const spacingMultiplier = Math.random() < 0.3 ? 0.5 : (Math.random() < 0.5 ? 0.7 : 1.0); // 30% tight, 20% medium, 50% normal
      const spawnRate = Math.max(20, minSpawnRate * spacingMultiplier);
      
      if (frameCount.current % Math.floor(spawnRate) === 0) {
        const obstacleType = getObstacleType(score);
        let obstacleY = groundY.current - obstacleHeight; // Default: ground level
        let obsWidth = obstacleWidth;
        let obsHeight = obstacleHeight;
        
        // Fireball spawns in air (higher up)
        if (obstacleType === 'fireball') {
          obstacleY = groundY.current - obstacleHeight - 80 - Math.random() * 40; // Air level
          obsWidth = 35;
          obsHeight = 35;
        } else if (obstacleType === 'spike') {
          obsWidth = 40;
          obsHeight = 35; // Smaller spikes
        }
        
        obstacles.current.push({
          x: canvas.width,
          y: obstacleY,
          width: obsWidth,
          height: obsHeight,
          type: obstacleType,
        });
        
        // Spawn close-together obstacles (spike traps, tight spacing)
        const currentLevel = Math.floor(score / 20);
        const tightSpacingChance = Math.min(0.5, 0.15 + (currentLevel * 0.05)); // Up to 50% chance for tight spacing
        
        if (Math.random() < tightSpacingChance) {
          // Spawn 2-3 obstacles very close together (spike trap formation)
          const numCloseObstacles = currentLevel >= 3 ? 3 : 2;
          const baseX = canvas.width;
          
          for (let i = 1; i <= numCloseObstacles; i++) {
            const closeType = getObstacleType(score);
            let closeY = groundY.current - obstacleHeight;
            let closeWidth = obstacleWidth;
            let closeHeight = obstacleHeight;
            
            if (closeType === 'fireball') {
              closeY = groundY.current - obstacleHeight - 60 - Math.random() * 50;
              closeWidth = 35;
              closeHeight = 35;
            } else if (closeType === 'spike') {
              closeWidth = 40;
              closeHeight = 35;
            }
            
            // Very tight spacing: 15-30 pixels apart (much closer than before)
            const tightDelay = 15 + Math.random() * 15;
            obstacles.current.push({
              x: baseX + tightDelay * gameSpeed.current * i,
              y: closeY,
              width: closeWidth,
              height: closeHeight,
              type: closeType,
            });
          }
        } else if (currentLevel >= 2) {
          // Normal double obstacles (with random spacing)
          const doubleObstacleChance = Math.min(0.6, 0.2 + (currentLevel * 0.1));
          if (Math.random() < doubleObstacleChance) {
            const secondType = getObstacleType(score);
            let secondY = groundY.current - obstacleHeight;
            let secondWidth = obstacleWidth;
            let secondHeight = obstacleHeight;
            
            if (secondType === 'fireball') {
              secondY = groundY.current - obstacleHeight - 60 - Math.random() * 50;
              secondWidth = 35;
              secondHeight = 35;
            } else if (secondType === 'spike') {
              secondWidth = 40;
              secondHeight = 35;
            }
            
            // Random spacing: sometimes close (30-50), sometimes normal (50-80)
            const spacingRange = Math.random() < 0.4 ? [30, 50] : [50, 80];
            const secondObstacleDelay = spacingRange[0] + Math.random() * (spacingRange[1] - spacingRange[0]);
            
            obstacles.current.push({
              x: canvas.width + secondObstacleDelay * gameSpeed.current,
              y: secondY,
              width: secondWidth,
              height: secondHeight,
              type: secondType,
            });
          }
        }
        
        // Triple obstacles at very high scores (level 5+ = score 100+)
        if (currentLevel >= 5 && Math.random() < 0.3) {
          const thirdType = getObstacleType(score);
          let thirdY = groundY.current - obstacleHeight;
          let thirdWidth = obstacleWidth;
          let thirdHeight = obstacleHeight;
          
          if (thirdType === 'fireball') {
            thirdY = groundY.current - obstacleHeight - 40 - Math.random() * 60;
            thirdWidth = 35;
            thirdHeight = 35;
          } else if (thirdType === 'spike') {
            thirdWidth = 40;
            thirdHeight = 35;
          }
          
          const thirdObstacleDelay = 40 + Math.random() * 30;
          obstacles.current.push({
            x: canvas.width + thirdObstacleDelay * gameSpeed.current,
            y: thirdY,
            width: thirdWidth,
            height: thirdHeight,
            type: thirdType,
          });
        }
      }
      
      // Spawn flying fireballs (projectiles from front)
      // Start spawning at score 30, one at a time
      if (score >= 30) {
        // Spawn interval: 60-80 frames (every ~1-1.3 seconds at 60fps)
        const baseSpawnInterval = Math.max(50, 80 - (level * 4)); // Faster spawn as level increases
        const framesSinceLastSpawn = frameCount.current - lastFlyingFireballSpawn.current;
        
        // Spawn if enough time has passed and not too many on screen
        if (framesSinceLastSpawn >= baseSpawnInterval && flyingFireballs.current.length < 3) {
          // Y position EXACTLY aligned with obstacles (same positions)
          let startY;
          const positionType = Math.random();
          
          if (positionType < 0.5) {
            // 50% chance: Ground level (EXACTLY same as rock/spike obstacles)
            startY = groundY.current - obstacleHeight;
          } else if (positionType < 0.8) {
            // 30% chance: Low air (EXACTLY same as static fireball low position)
            startY = groundY.current - obstacleHeight - 40 - Math.random() * 30;
          } else {
            // 20% chance: High air (EXACTLY same as static fireball high position)
            startY = groundY.current - obstacleHeight - 80 - Math.random() * 40;
          }
          
          // Straight trajectory towards player (more dangerous)
          const angle = -Math.PI + (Math.random() * 0.3 - 0.15); // Less variation = more accurate
          const speed = gameSpeed.current * 1.4; // Even faster - 1.4x speed
          
          flyingFireballs.current.push({
            x: canvas.width + 50,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed * 0.2, // Less vertical = straighter path
            width: 35,
            height: 35,
            angle: angle,
            life: 0, // For animation
          });
          
          // Update last spawn time
          lastFlyingFireballSpawn.current = frameCount.current;
        }
      }

      // Update and draw flying fireballs
      flyingFireballs.current.forEach((fireball, index) => {
        // Update position
        fireball.x += fireball.vx;
        fireball.y += fireball.vy;
        fireball.life += 0.1;
        
        // Apply slight gravity or wave motion
        fireball.vy += 0.05; // Slight downward drift
        
        // Draw flying fireball with trail effect
        const centerX = fireball.x;
        const centerY = fireball.y;
        const time = fireball.life;
        
        // Draw trail (trailing particles)
        for (let i = 0; i < 3; i++) {
          const trailX = centerX - (i * 8);
          const trailY = centerY + Math.sin(time + i) * 2;
          const trailAlpha = 0.4 - (i * 0.1);
          const trailSize = fireball.width * 0.6 - (i * 3);
          
          const trailGradient = ctx.createRadialGradient(trailX, trailY, 0, trailX, trailY, trailSize);
          trailGradient.addColorStop(0, `rgba(255, 100, 0, ${trailAlpha})`);
          trailGradient.addColorStop(1, `rgba(255, 200, 0, 0)`);
          ctx.fillStyle = trailGradient;
          ctx.beginPath();
          ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Main fireball body
        const fireGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fireball.width / 2);
        fireGradient.addColorStop(0, '#FFFF00');
        fireGradient.addColorStop(0.3, '#FF4500');
        fireGradient.addColorStop(0.7, '#FF6347');
        fireGradient.addColorStop(1, '#FF8C00');
        ctx.fillStyle = fireGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, fireball.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core (bright center)
        const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fireball.width / 3);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(1, '#FFFF00');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, fireball.width / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Fire particles around (animated)
        ctx.fillStyle = '#FF6347';
        for (let i = 0; i < 6; i++) {
          const angle = (time * 2 + i * 1.0) % (Math.PI * 2);
          const dist = fireball.width / 2.5 + Math.sin(time * 3 + i) * 4;
          const px = centerX + Math.cos(angle) * dist;
          const py = centerY + Math.sin(angle) * dist;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.sin(time + i), 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Collision detection with pet
        if (
          petX + 10 < fireball.x + fireball.width - 5 &&
          petX + petWidth - 10 > fireball.x + 5 &&
          petY.current < fireball.y + fireball.height &&
          petY.current + petHeight > fireball.y
        ) {
          setGameOver(true);
        }
        
        // Remove off-screen or past player
        if (fireball.x + fireball.width < -50 || fireball.x > canvas.width + 50 || fireball.y > canvas.height + 50) {
          flyingFireballs.current.splice(index, 1);
        }
      });

      // Update and draw obstacles
      obstacles.current.forEach((obstacle, index) => {
        obstacle.x -= gameSpeed.current;
        const obstacleType = obstacle.type || 'rock';

        // Draw obstacle shadow (only for ground obstacles)
        if (obstacleType !== 'fireball') {
          const obstacleGroundY = obstacle.y + obstacle.height;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(obstacle.x + obstacle.width / 2, obstacleGroundY + 5, obstacle.width * 0.5, obstacle.width * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw different obstacle types
        if (obstacleType === 'fireball') {
          // Draw fireball (animated fire)
          const time = frameCount.current * 0.2;
          const centerX = obstacle.x + obstacle.width / 2;
          const centerY = obstacle.y + obstacle.height / 2;
          
          // Outer fire (red-orange)
          const fireGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, obstacle.width / 2);
          fireGradient.addColorStop(0, '#FF4500');
          fireGradient.addColorStop(0.5, '#FF6347');
          fireGradient.addColorStop(1, '#FF8C00');
          ctx.fillStyle = fireGradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, obstacle.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner core (yellow-white)
          const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, obstacle.width / 3);
          coreGradient.addColorStop(0, '#FFFF00');
          coreGradient.addColorStop(1, '#FF4500');
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, obstacle.width / 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Fire particles (animated)
          ctx.fillStyle = '#FF6347';
          for (let i = 0; i < 5; i++) {
            const angle = (time + i * 1.2) % (Math.PI * 2);
            const dist = obstacle.width / 3 + Math.sin(time + i) * 3;
            const px = centerX + Math.cos(angle) * dist;
            const py = centerY + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (obstacleType === 'spike') {
          // Draw spike (triangle pointing up)
          ctx.fillStyle = '#8B4513';
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y); // Top point
          ctx.lineTo(obstacle.x, obstacle.y + obstacle.height); // Bottom left
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height); // Bottom right
          ctx.closePath();
          ctx.fill();
          
          // Spike highlight
          ctx.fillStyle = '#A0522D';
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width / 2 - 5, obstacle.y + obstacle.height - 5);
          ctx.lineTo(obstacle.x + obstacle.width / 2 + 5, obstacle.y + obstacle.height - 5);
          ctx.closePath();
          ctx.fill();
          
          // Metal tip
          ctx.fillStyle = '#708090';
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width / 2 - 3, obstacle.y + 8);
          ctx.lineTo(obstacle.x + obstacle.width / 2 + 3, obstacle.y + 8);
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw rock (original obstacle)
          const obstacleGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.height);
          obstacleGradient.addColorStop(0, '#5A5A5A');
          obstacleGradient.addColorStop(0.5, '#4A4A4A');
          obstacleGradient.addColorStop(1, '#3A3A3A');
          ctx.fillStyle = obstacleGradient;
          
          const radius = 8;
          ctx.beginPath();
          ctx.moveTo(obstacle.x + radius, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width - radius, obstacle.y);
          ctx.quadraticCurveTo(obstacle.x + obstacle.width, obstacle.y, obstacle.x + obstacle.width, obstacle.y + radius);
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height - radius);
          ctx.quadraticCurveTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height, obstacle.x + obstacle.width - radius, obstacle.y + obstacle.height);
          ctx.lineTo(obstacle.x + radius, obstacle.y + obstacle.height);
          ctx.quadraticCurveTo(obstacle.x, obstacle.y + obstacle.height, obstacle.x, obstacle.y + obstacle.height - radius);
          ctx.lineTo(obstacle.x, obstacle.y + radius);
          ctx.quadraticCurveTo(obstacle.x, obstacle.y, obstacle.x + radius, obstacle.y);
          ctx.closePath();
          ctx.fill();
          
          // Draw highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          const hlRadius = 4;
          ctx.moveTo(obstacle.x + 2 + hlRadius, obstacle.y + 2);
          ctx.lineTo(obstacle.x + obstacle.width - 10 - hlRadius, obstacle.y + 2);
          ctx.quadraticCurveTo(obstacle.x + obstacle.width - 10, obstacle.y + 2, obstacle.x + obstacle.width - 10, obstacle.y + 2 + hlRadius);
          ctx.lineTo(obstacle.x + obstacle.width - 10, obstacle.y + 17 - hlRadius);
          ctx.quadraticCurveTo(obstacle.x + obstacle.width - 10, obstacle.y + 17, obstacle.x + obstacle.width - 10 - hlRadius, obstacle.y + 17);
          ctx.lineTo(obstacle.x + 2 + hlRadius, obstacle.y + 17);
          ctx.quadraticCurveTo(obstacle.x + 2, obstacle.y + 17, obstacle.x + 2, obstacle.y + 17 - hlRadius);
          ctx.lineTo(obstacle.x + 2, obstacle.y + 2 + hlRadius);
          ctx.quadraticCurveTo(obstacle.x + 2, obstacle.y + 2, obstacle.x + 2 + hlRadius, obstacle.y + 2);
          ctx.closePath();
          ctx.fill();
          
          // Draw detail lines
          ctx.strokeStyle = '#2A2A2A';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obstacle.x + 8, obstacle.y + 10);
          ctx.lineTo(obstacle.x + obstacle.width - 8, obstacle.y + 10);
          ctx.moveTo(obstacle.x + 8, obstacle.y + obstacle.height - 10);
          ctx.lineTo(obstacle.x + obstacle.width - 8, obstacle.y + obstacle.height - 10);
          ctx.stroke();
        }

        // Collision detection (more precise)
        // Pet bottom is at petY.current + petHeight
        // Obstacle bottom is at obstacle.y + obstacle.height (should be at groundY.current)
        // Check if pet overlaps with obstacle
        if (
          petX + 10 < obstacle.x + obstacle.width - 5 &&
          petX + petWidth - 10 > obstacle.x + 5 &&
          petY.current < obstacle.y + obstacle.height &&
          petY.current + petHeight > obstacle.y
        ) {
          setGameOver(true);
        }

        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
          obstacles.current.splice(index, 1);
          setScore(prev => prev + 10);
        }
      });

      // Increase game speed based on score (every 20 points = level up)
      // Use the level variable already declared above
      const baseSpeed = 10; // Increased from 6 to 10 for faster start
      const speedIncreasePerLevel = 1.5; // Increase speed by 1.5 every 20 points
      const maxSpeed = 30; // Increased max speed from 25 to 30
      const targetSpeed = Math.min(baseSpeed + (level * speedIncreasePerLevel), maxSpeed);
      
      // Smoothly increase speed towards target
      if (gameSpeed.current < targetSpeed) {
        gameSpeed.current = Math.min(gameSpeed.current + 0.15, targetSpeed);
      }
      
      // Draw score on canvas (additional visual feedback)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'right';
      ctx.strokeText(`Score: ${score}`, canvas.width - 20, 40);
      ctx.fillText(`Score: ${score}`, canvas.width - 20, 40);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      window.removeEventListener('resize', resizeHandler);
    };
  }, [gameOver, isPaused, fullscreen]);

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    // Set pet position correctly: bottom at groundY, so top = groundY - petHeight
    petY.current = groundY.current ? groundY.current - petHeight : 200 - petHeight;
    petVelocity.current = 0;
    isJumping.current = false;
    obstacles.current = [];
    flyingFireballs.current = []; // Reset flying fireballs
    clouds.current = [];
    gameSpeed.current = 10; // Updated to match new base speed
    frameCount.current = 0;
    lastFlyingFireballSpawn.current = 0; // Reset flying fireball spawn timer
    // Call onRestart if provided (will restart game without spending energy again)
    if (onRestart) {
      onRestart();
    }
  };

  const handleExit = async () => {
    // Save score to leaderboard when game ends
    if (address && score > 0) {
      try {
        const petName = petData?.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${petData?.tokenId || 'Unknown'}`;
        await saveGameScore(
          address,
          'froth-run',
          score,
          petName,
          petData?.tokenId || null
        );
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
    // Pass true to reset energy flag when exiting game completely
    onGameEnd(score, true);
  };

  // Auto-save score when game over
  useEffect(() => {
    if (gameOver && address && score > 0) {
      const saveScore = async () => {
        try {
          const petName = petData?.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${petData?.tokenId || 'Unknown'}`;
          await saveGameScore(
            address,
            'froth-run',
            score,
            petName,
            petData?.tokenId || null
          );
        } catch (error) {
          console.error('Error saving score:', error);
        }
      };
      saveScore();
    }
  }, [gameOver, address, score, petData]);

  // Fullscreen mode - different layout
  if (fullscreen) {
    return (
      <div className="h-screen w-screen relative bg-gradient-to-b from-blue-300 to-blue-200 overflow-hidden">
        {/* Score overlay - top left */}
        <div className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur-sm px-5 py-2.5 rounded-xl border-2 border-white/20 shadow-xl">
          <span className="text-2xl font-bold text-white drop-shadow-lg">Score: {score}</span>
        </div>

        {/* Exit button - top right */}
        <button
          onClick={() => handleExit()}
          className="absolute top-4 right-4 z-20 bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-600 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 border-2 border-red-600"
        >
          Exit
        </button>

        {/* Game Canvas - Fullscreen */}
        <div 
          className="h-full w-full relative"
          onTouchStart={handleTouchStart}
          onClick={handleJump}
          style={{ touchAction: 'none', cursor: 'pointer' }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: 'block' }}
          />
          
          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-4 z-30">
              <div className="text-7xl mb-2">💥</div>
              <h3 className="text-4xl font-bold text-white mb-2">Game Over!</h3>
              <p className="text-2xl text-white mb-6">Final Score: <span className="font-bold text-green-400">{score}</span></p>
              <div className="flex gap-4">
                <button
                  onClick={handleRestart}
                  className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-green-600 transition-colors shadow-lg"
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={() => handleExit()}
                  className="bg-gray-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-gray-700 transition-colors shadow-lg"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!gameOver && !isPaused && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg z-20">
              <p className="text-sm font-semibold text-white">
                Press SPACE or tap to jump!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal mode (with header and info)
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <PlayCircle size={28} strokeWidth={2.5} />
            FROTH RUN
          </h2>
          <div className="bg-green-100 px-4 py-2 rounded-lg border-2 border-green-500">
            <span className="text-lg font-bold text-green-700">Score: {score}</span>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
        >
          Exit Game
        </button>
      </div>

      {/* Game Canvas */}
      <div 
        className="relative bg-gradient-to-b from-blue-200 to-blue-100 rounded-xl shadow-2xl border-4 border-green-500 overflow-hidden"
        onTouchStart={handleTouchStart}
        onClick={handleJump}
        style={{ touchAction: 'none', cursor: 'pointer' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ display: 'block', height: '300px', maxHeight: '400px' }}
        />
        
        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center flex-col gap-4">
            <div className="text-6xl mb-2">💥</div>
            <h3 className="text-3xl font-bold text-white mb-2">Game Over!</h3>
            <p className="text-xl text-white mb-4">Final Score: <span className="font-bold text-green-400">{score}</span></p>
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
              >
                🔄 Play Again
              </button>
              <button
                onClick={handleExit}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">⏸️</div>
              <h3 className="text-2xl font-bold text-white mb-4">Paused</h3>
              <button
                onClick={() => setIsPaused(false)}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-colors"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!gameOver && !isPaused && (
          <div className="absolute top-4 left-4 bg-white/90 px-3 py-2 rounded-lg shadow-md">
            <p className="text-xs font-semibold text-gray-700">
              Press SPACE or tap to jump!
            </p>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="mt-4 bg-white rounded-lg p-4 shadow-md border border-green-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Playing as: </span>
            <span className="text-green-700 font-bold">
              {petData?.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${petData?.tokenId || ''}`}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Energy Cost: </span>
            <span className="text-red-600 font-bold">-{energyCost}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

