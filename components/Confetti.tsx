import React, { useEffect, useRef } from 'react';

const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#ffffff'];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      life: number;
      decay: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 6 + 2;
        this.life = 1;
        this.decay = Math.random() * 0.015 + 0.005;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.vx *= 0.95; // Drag
        this.vy *= 0.95;
        this.life -= this.decay;
        this.size *= 0.95;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Explosion center
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 150; i++) {
      particles.push(new Particle(cx, cy));
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-50"
    />
  );
};

export default Confetti;
