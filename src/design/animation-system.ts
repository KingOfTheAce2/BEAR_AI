import React from 'react';

/**
 * BEAR AI Apple-Grade Animation System
 * 
 * Comprehensive animation system inspired by Apple's motion design principles.
 * Provides spring physics, micro-interactions, and smooth transitions that
 * create delightful user experiences comparable to native macOS applications.
 */

export interface SpringConfig {
  tension: number;
  friction: number;
  mass?: number;
  velocity?: number;
}

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface TransformValues {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  skew?: number;
  skewX?: number;
  skewY?: number;
}

/**
 * Spring Physics Configurations
 * Based on Apple's preferred motion curves and Material Design principles
 */
export const SpringConfigs = {
  // Gentle springs for subtle interactions
  gentle: { tension: 120, friction: 14, mass: 1 },
  
  // Wobbly springs for playful interactions
  wobbly: { tension: 180, friction: 12, mass: 1 },
  
  // Stiff springs for quick, responsive interactions
  stiff: { tension: 210, friction: 20, mass: 1 },
  
  // Slow springs for smooth, deliberate animations
  slow: { tension: 280, friction: 60, mass: 1 },
  
  // Apple-specific configurations
  apple: {
    // Standard iOS/macOS spring
    standard: { tension: 300, friction: 30, mass: 1 },
    // Bouncy spring for drawer/modal presentations  
    bouncy: { tension: 400, friction: 25, mass: 1 },
    // Quick spring for button presses
    quick: { tension: 500, friction: 40, mass: 0.8 },
    // Smooth spring for page transitions
    smooth: { tension: 200, friction: 25, mass: 1.2 }
  }
} as const;

/**
 * Easing Curves
 * Apple's signature easing functions and Material Design curves
 */
export const EasingCurves = {
  // Apple's standard easing curves
  apple: {
    standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
    entrance: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0.0, 0, 1)'
  },
  
  // Material Design easing curves
  material: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    accelerated: 'cubic-bezier(0.4, 0.0, 1, 1)',
    decelerated: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    emphasized: 'cubic-bezier(0.2, 0.0, 0, 1)'
  },
  
  // Playful easing curves
  playful: {
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
  }
} as const;

/**
 * Animation Durations
 * Semantic duration tokens for consistent timing
 */
export const Durations = {
  instant: 0,
  immediate: 50,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 750,
  slowest: 1000
} as const;

/**
 * Micro-Interaction Patterns
 * Pre-defined animation patterns for common UI interactions
 */
export const MicroInteractions = {
  // Button interactions
  button: {
    press: {
      transform: { scale: 0.96 },
      duration: Durations.immediate,
      easing: EasingCurves.apple.exit
    },
    release: {
      transform: { scale: 1 },
      duration: Durations.fast,
      easing: EasingCurves.apple.entrance
    },
    hover: {
      transform: { scale: 1.02, y: -1 },
      duration: Durations.fast,
      easing: EasingCurves.apple.standard
    }
  },
  
  // Card interactions
  card: {
    hover: {
      transform: { scale: 1.02, y: -4 },
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
      duration: Durations.normal,
      easing: EasingCurves.apple.standard
    },
    press: {
      transform: { scale: 0.98, y: -2 },
      duration: Durations.immediate,
      easing: EasingCurves.apple.exit
    }
  },
  
  // Input interactions
  input: {
    focus: {
      borderColor: 'var(--color-primary-500)',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      duration: Durations.fast,
      easing: EasingCurves.apple.entrance
    },
    blur: {
      borderColor: 'var(--border-medium)',
      boxShadow: 'none',
      duration: Durations.fast,
      easing: EasingCurves.apple.exit
    }
  },
  
  // Navigation interactions
  navigation: {
    itemHover: {
      transform: { x: 4 },
      backgroundColor: 'var(--surface-level-1)',
      duration: Durations.fast,
      easing: EasingCurves.apple.standard
    },
    itemActive: {
      transform: { x: 0 },
      backgroundColor: 'var(--color-primary-500)',
      color: 'white',
      duration: Durations.normal,
      easing: EasingCurves.apple.standard
    },
    sidebarCollapse: {
      width: '64px',
      duration: Durations.slow,
      easing: EasingCurves.apple.emphasized
    },
    sidebarExpand: {
      width: '280px',
      duration: Durations.slow,
      easing: EasingCurves.apple.emphasized
    }
  },
  
  // Modal/Dialog interactions
  modal: {
    entrance: {
      opacity: 1,
      transform: { scale: 1, y: 0 },
      duration: Durations.normal,
      easing: EasingCurves.apple.entrance
    },
    exit: {
      opacity: 0,
      transform: { scale: 0.95, y: 10 },
      duration: Durations.fast,
      easing: EasingCurves.apple.exit
    },
    backdropEntrance: {
      opacity: 1,
      duration: Durations.normal,
      easing: EasingCurves.apple.entrance
    },
    backdropExit: {
      opacity: 0,
      duration: Durations.fast,
      easing: EasingCurves.apple.exit
    }
  },
  
  // Message/Toast interactions
  message: {
    slideIn: {
      opacity: 1,
      transform: { x: 0, scale: 1 },
      duration: Durations.normal,
      easing: EasingCurves.playful.spring
    },
    slideOut: {
      opacity: 0,
      transform: { x: 100, scale: 0.9 },
      duration: Durations.fast,
      easing: EasingCurves.apple.exit
    },
    bounce: {
      transform: { scale: 1.05 },
      duration: Durations.immediate,
      easing: EasingCurves.playful.bounce
    }
  }
} as const;

/**
 * Animation State Machine
 * Manages complex animation sequences and state transitions
 */
export class AnimationStateMachine {
  private currentState: string = 'idle';
  private animations: Map<string, Animation> = new Map();
  private element: HTMLElement;
  
  constructor(element: HTMLElement) {
    this.element = element;
  }
  
  /**
   * Transition to a new animation state
   */
  async transitionTo(
    stateName: string,
    animation: AnimationConfig & { transform?: TransformValues; [key: string]: any }
  ): Promise<void> {
    // Cancel any running animations
    this.cancelAnimations();
    
    this.currentState = stateName;
    
    return new Promise((resolve) => {
      const keyframes: Keyframe[] = [
        this.getCurrentStyles(),
        this.buildKeyframe(animation)
      ];
      
      const options: KeyframeAnimationOptions = {
        duration: animation.duration || Durations.normal,
        easing: animation.easing || EasingCurves.apple.standard,
        fill: animation.fill || 'both'
      };
      
      const webAnimation = this.element.animate(keyframes, options);
      this.animations.set(stateName, webAnimation);
      
      webAnimation.addEventListener('finish', () => {
        this.animations.delete(stateName);
        resolve();
      });
    });
  }
  
  /**
   * Apply spring animation using CSS custom properties
   */
  applySpring(
    property: string,
    targetValue: string | number,
    springConfig: SpringConfig = SpringConfigs.gentle
  ): void {
    const { tension, friction, mass = 1 } = springConfig;
    
    // Use CSS custom properties for spring animation
    this.element.style.setProperty(`--spring-tension`, tension.toString());
    this.element.style.setProperty(`--spring-friction`, friction.toString());
    this.element.style.setProperty(`--spring-mass`, mass.toString());
    this.element.style.setProperty(`--target-${property}`, targetValue.toString());
    
    // Apply spring animation class
    this.element.classList.add('spring-animated');
  }
  
  /**
   * Cancel all running animations
   */
  cancelAnimations(): void {
    this.animations.forEach(animation => animation.cancel());
    this.animations.clear();
  }
  
  /**
   * Get current computed styles
   */
  private getCurrentStyles(): Keyframe {
    const computed = getComputedStyle(this.element);
    return {
      opacity: computed.opacity,
      transform: computed.transform,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      boxShadow: computed.boxShadow
    };
  }
  
  /**
   * Build keyframe from animation config
   */
  private buildKeyframe(animation: any): Keyframe {
    const keyframe: Keyframe = {};
    
    // Handle transform values
    if (animation.transform) {
      const transforms: string[] = [];
      const { transform } = animation;
      
      if (transform.x !== undefined) transforms.push(`translateX(${transform.x}px)`);
      if (transform.y !== undefined) transforms.push(`translateY(${transform.y}px)`);
      if (transform.z !== undefined) transforms.push(`translateZ(${transform.z}px)`);
      if (transform.scale !== undefined) transforms.push(`scale(${transform.scale})`);
      if (transform.scaleX !== undefined) transforms.push(`scaleX(${transform.scaleX})`);
      if (transform.scaleY !== undefined) transforms.push(`scaleY(${transform.scaleY})`);
      if (transform.rotate !== undefined) transforms.push(`rotate(${transform.rotate}deg)`);
      if (transform.rotateX !== undefined) transforms.push(`rotateX(${transform.rotateX}deg)`);
      if (transform.rotateY !== undefined) transforms.push(`rotateY(${transform.rotateY}deg)`);
      if (transform.skew !== undefined) transforms.push(`skew(${transform.skew}deg)`);
      if (transform.skewX !== undefined) transforms.push(`skewX(${transform.skewX}deg)`);
      if (transform.skewY !== undefined) transforms.push(`skewY(${transform.skewY}deg)`);
      
      if (transforms.length > 0) {
        keyframe.transform = transforms.join(' ');
      }
    }
    
    // Handle other CSS properties
    Object.keys(animation).forEach(key => {
      if (key !== 'transform' && key !== 'duration' && key !== 'easing' && key !== 'fill') {
        keyframe[key as any] = animation[key];
      }
    });
    
    return keyframe;
  }
}

/**
 * Animation Utilities
 * Helper functions for common animation tasks
 */
export const AnimationUtils = {
  /**
   * Create a staggered animation sequence
   */
  stagger: (
    elements: HTMLElement[],
    animation: AnimationConfig & { transform?: TransformValues; [key: string]: any },
    staggerDelay: number = 50
  ): Promise<void[]> => {
    return Promise.all(
      elements.map((element, index) => {
        const stateMachine = new AnimationStateMachine(element);
        return stateMachine.transitionTo('stagger', {
          ...animation,
          delay: (animation.delay || 0) + (index * staggerDelay)
        });
      })
    );
  },
  
  /**
   * Animate element entrance
   */
  entrance: async (
    element: HTMLElement,
    type: 'fade' | 'slide' | 'scale' | 'spring' = 'fade'
  ): Promise<void> => {
    const stateMachine = new AnimationStateMachine(element);
    
    const animations = {
      fade: {
        opacity: 1,
        duration: Durations.normal,
        easing: EasingCurves.apple.entrance
      },
      slide: {
        opacity: 1,
        transform: { y: 0 },
        duration: Durations.normal,
        easing: EasingCurves.apple.entrance
      },
      scale: {
        opacity: 1,
        transform: { scale: 1 },
        duration: Durations.normal,
        easing: EasingCurves.apple.entrance
      },
      spring: {
        opacity: 1,
        transform: { scale: 1 },
        duration: Durations.slow,
        easing: EasingCurves.playful.spring
      }
    };
    
    // Set initial state
    element.style.opacity = '0';
    if (type === 'slide') element.style.transform = 'translateY(20px)';
    if (type === 'scale' || type === 'spring') element.style.transform = 'scale(0.9)';
    
    return stateMachine.transitionTo('entrance', animations[type]);
  },
  
  /**
   * Animate element exit
   */
  exit: async (
    element: HTMLElement,
    type: 'fade' | 'slide' | 'scale' = 'fade'
  ): Promise<void> => {
    const stateMachine = new AnimationStateMachine(element);
    
    const animations = {
      fade: {
        opacity: 0,
        duration: Durations.fast,
        easing: EasingCurves.apple.exit
      },
      slide: {
        opacity: 0,
        transform: { y: -20 },
        duration: Durations.fast,
        easing: EasingCurves.apple.exit
      },
      scale: {
        opacity: 0,
        transform: { scale: 0.9 },
        duration: Durations.fast,
        easing: EasingCurves.apple.exit
      }
    };
    
    return stateMachine.transitionTo('exit', animations[type]);
  },
  
  /**
   * Create a ripple effect (Material Design inspired)
   */
  ripple: (element: HTMLElement, x: number, y: number): void => {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - rect.left - size / 2}px`;
    ripple.style.top = `${y - rect.top - size / 2}px`;
    
    element.appendChild(ripple);
    
    // Animate ripple
    ripple.animate([
      { transform: 'scale(0)', opacity: 1 },
      { transform: 'scale(1)', opacity: 0 }
    ], {
      duration: 600,
      easing: EasingCurves.material.standard
    }).addEventListener('finish', () => {
      ripple.remove();
    });
  },
  
  /**
   * Smooth scroll to element
   */
  scrollIntoView: (
    element: HTMLElement,
    behavior: ScrollBehavior = 'smooth',
    block: ScrollLogicalPosition = 'center'
  ): void => {
    element.scrollIntoView({
      behavior,
      block,
      inline: 'nearest'
    });
  }
};

/**
 * React Hook for Animation State Machine
 */
export const useAnimation = (ref: React.RefObject<HTMLElement>) => {
  const [stateMachine, setStateMachine] = React.useState<AnimationStateMachine | null>(null);
  
  React.useEffect(() => {
    if (ref.current) {
      setStateMachine(new AnimationStateMachine(ref.current));
    }
  }, [ref]);
  
  return {
    transitionTo: (state: string, animation: any) => 
      stateMachine?.transitionTo(state, animation),
    applySpring: (property: string, value: string | number, config?: SpringConfig) =>
      stateMachine?.applySpring(property, value, config),
    cancelAnimations: () => stateMachine?.cancelAnimations()
  };
};

export default {
  SpringConfigs,
  EasingCurves,
  Durations,
  MicroInteractions,
  AnimationStateMachine,
  AnimationUtils,
  useAnimation
};