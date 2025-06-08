// Enhanced Main Application with Complete Debug System Integration
// This file serves as the "conductor" that orchestrates the interaction between
// artistic controls and mathematical exploration within the same fractal visualization system
//
// ARCHITECTURAL CONCEPT:
// We're implementing a "dual-personality" application that serves both:
// 1. Artists who want intuitive creative controls
// 2. Mathematicians/developers who want deep parameter access
//
// The challenge is making these two use cases coexist without interfering with each other

import { ParameterManager } from './modules/parameters.js';
import { AudioSystem } from './modules/audio.js';
import { ControlsManager } from './modules/controls.js';
import { Renderer } from './modules/renderer.js';
import { UIManager } from './modules/ui.js';
import { FileManager } from './modules/fileIO.js';
import { DebugUIManager } from './modules/debug-ui.js'; // NEW: Mathematical exploration interface

class KaldaoApp {
    constructor() {
        // CORE SYSTEM MODULES
        // These represent the fundamental capabilities of the fractal system
        // Each module has a specific responsibility and communicates through well-defined interfaces
        this.parameters = new ParameterManager();    // Mathematical state management (artistic + debug)
        this.audio = new AudioSystem();               // Audio analysis and reactive parameter modulation
        this.controls = new ControlsManager();        // Context-sensitive input handling
        this.renderer = new Renderer();               // WebGL mathematical visualization
        this.ui = new UIManager();                    // Artistic interface management
        this.fileManager = new FileManager();         // State persistence and sharing
        this.debugUI = new DebugUIManager();          // Mathematical exploration interface
        
        // APPLICATION STATE MANAGEMENT
        // These variables track the current operational context and user preferences
        // Think of this as the "personality" the application is currently expressing
        
        // Animation control (affects both artistic and mathematical exploration)
        this.animationPaused = false;
        
        // Artistic interface state (unchanged from original system)
        this.currentParameterIndex = 0;               // Which artistic parameter is currently selected
        this.currentPaletteIndex = 0;                 // Which color palette is active
        this.useColorPalette = false;                 // Whether to use mathematical color generation
        this.invertColors = false;                    // Whether to apply color inversion post-processing
        this.menuVisible = false;                     // Whether the main artistic menu is shown
        
        // NEW: Mathematical exploration state
        // This represents a parallel interface state for deep parameter exploration
        this.debugMenuVisible = false;                // Whether mathematical parameter interface is active
        this.debugSessionStartTime = 0;               // When current debug session began (for analytics)
        this.debugParameterChangeCount = 0;           // How many mathematical changes made this session
        
        // ENHANCED UNDO/REDO SYSTEM
        // This system now tracks changes across both artistic and mathematical parameter spaces
        // It's crucial for safe exploration - users can experiment fearlessly knowing they can undo
        this.undoStack = [];                          // History of previous states (both artistic + mathematical)
        this.redoStack = [];                          // Forward history for redo operations
        this.maxUndoSteps = 50;                       // Memory management for undo history
        
        // SYSTEM DIAGNOSTICS AND ANALYTICS
        // These help us understand how the system is being used and optimize performance
        this.performanceMetrics = {
            frameCount: 0,                            // Total frames rendered
            lastFrameTime: 0,                         // Performance monitoring
            averageFrameTime: 16.67,                  // Target: 60 FPS = 16.67ms per frame
            debugModeUsageTime: 0                     // How much time spent in mathematical exploration
        };
    }
    
    // SYSTEM INITIALIZATION
    // This orchestrates the startup sequence, ensuring all components initialize in the correct order
    // Order matters here because some components depend on others being ready first
    async init() {
        try {
            console.log('🚀 Initializing Kaldao Fractal Visualizer with Debug System...');
            
            // PHASE 1: Core mathematical engine initialization
            // The renderer must initialize first because it sets up the WebGL context
            // that other systems may need to query for capabilities
            await this.renderer.init();
            console.log('✅ Mathematical rendering engine initialized');
            
            // PHASE 2: Input and interface systems
            // These systems need to initialize after the renderer so they can
            // provide feedback about rendering capabilities and constraints
            this.controls.init(this);                 // Context-sensitive input handling
            this.ui.init(this);                       // Artistic interface management
            this.audio.init(this);                    // Audio analysis system
            this.fileManager.init(this);              // State persistence system
            this.debugUI.init(this);                  // Mathematical exploration interface
            console.log('✅ All interface and control systems initialized');
            
            // PHASE 3: System integration and event handling
            // Set up cross-system communication and external event handling
            this.setupSystemIntegration();
            
            // PHASE 4: Initial state and user feedback
            // Provide immediate feedback that the system is ready and functional
            this.ui.updateStatus('✅ Kaldao loaded successfully! Press ; for debug mode.', 'success');
            this.ui.updateDisplay();
            this.ui.showControls();
            
            // PHASE 5: Begin the main application loop
            // This starts the continuous rendering and state update cycle
            this.startRenderLoop();
            
            console.log('🎯 System fully operational - dual-mode fractal visualization ready');
            
        } catch (error) {
            // Graceful error handling with detailed information for debugging
            this.ui.updateStatus(`❌ Initialization failed: ${error.message}`, 'error');
            console.error('System initialization error:', error);
            
            // Attempt basic fallback operation even if advanced features failed
            this.attemptFallbackInitialization();
        }
    }
    
    // SYSTEM INTEGRATION SETUP
    // This establishes the communication pathways between different components
    // Think of this as setting up the "nervous system" that lets different parts talk to each other
    setupSystemIntegration() {
        // Window resize handling affects both artistic and mathematical visualization
        window.addEventListener('resize', () => {
            this.renderer.handleResize();
            
            // Provide feedback about resolution changes, as they can affect parameter behavior
            const canvas = document.getElementById('canvas');
            if (canvas) {
                const resolution = `${canvas.width}x${canvas.height}`;
                this.ui.updateStatus(`Resolution: ${resolution}`, 'info');
            }
        });
        
        // Enhanced error handling for mathematical exploration safety
        window.addEventListener('error', (event) => {
            console.error('Application error:', event.error);
            
            // If we're in debug mode, provide specific guidance
            if (this.debugMenuVisible) {
                this.ui.updateStatus('⚠️ Error in debug mode - use Ctrl+Z to undo recent changes', 'error');
            }
        });
        
        // Performance monitoring for optimization feedback
        this.setupPerformanceMonitoring();
        
        // Development console access (only in development environments)
        this.setupDevelopmentAccess();
    }
    
    // PERFORMANCE MONITORING SYSTEM
    // This helps users understand when their mathematical explorations might be affecting performance
    setupPerformanceMonitoring() {
        setInterval(() => {
            // Calculate average frame rate over the last second
            const targetFrameTime = 16.67; // 60 FPS target
            const performanceRatio = this.performanceMetrics.averageFrameTime / targetFrameTime;
            
            // Warn users if mathematical complexity is affecting performance
            if (performanceRatio > 1.5 && this.debugMenuVisible) {
                this.ui.updateStatus('⚠️ Complex mathematical parameters may be affecting performance', 'warning');
            }
        }, 5000); // Check every 5 seconds
    }
    
    // DEVELOPMENT CONSOLE ACCESS
    // This provides advanced users with console-based access to the system internals
    setupDevelopmentAccess() {
        // Only enable in development environments for security
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '') {
            this.createConsoleInterface();
        }
    }
    
    // CONSOLE INTERFACE FOR ADVANCED DEBUGGING
    // This creates a powerful console-based interface for developers and advanced users
    createConsoleInterface() {
        window.kaldaoDebug = {
            // Direct parameter access
            getParam: (key) => {
                const value = this.parameters.getValue(key);
                console.log(`${key}: ${value}`);
                return value;
            },
            
            // Safe parameter modification with automatic undo state saving
            setParam: (key, value) => {
                this.saveStateForUndo();
                this.parameters.setValue(key, value);
                this.ui.updateDisplay();
                this.debugUI.updateDebugMenuDisplay();
                console.log(`Set ${key} to ${value}`);
            },
            
            // System state inspection
            getSystemStatus: () => {
                const status = this.getSystemStatus();
                console.table(status);
                return status;
            },
            
            // Parameter discovery
            listParams: (type = 'all') => {
                switch(type) {
                    case 'artistic':
                        console.log('Artistic Parameters:', this.parameters.parameterKeys);
                        break;
                    case 'debug':
                        console.log('Debug Parameters:', this.parameters.getAllDebugParameterKeys());
                        break;
                    default:
                        console.log('All Parameters:', Object.keys(this.parameters.getAllParameters()));
                }
            },
            
            // Mathematical state export
            exportMathState: () => {
                return this.debugUI.exportDebugState();
            },
            
            // Performance analysis
            getPerformanceMetrics: () => {
                console.table(this.performanceMetrics);
                return this.performanceMetrics;
            }
        };
        
        console.log('🔧 Debug console interface available: window.kaldaoDebug');
    }
    
    // MAIN RENDERING LOOP
    // This is the heart of the application - the continuous cycle that updates mathematics and renders visuals
    // The rendering loop must handle both artistic expression and mathematical exploration seamlessly
    startRenderLoop() {
        const render = () => {
            try {
                const frameStartTime = performance.now();
                const deltaTime = 1.0 / 60.0; // Target 60 FPS for smooth mathematical animation
                
                // MATHEMATICAL STATE UPDATES
                // These updates drive the continuous evolution of the fractal mathematics
                
                // Apply audio reactivity before updating time accumulation
                // This allows sound to modulate the mathematical parameters in real-time
                if (this.audio.isReactive()) {
                    this.audio.applyReactivity(this.parameters);
                }

                // Update time accumulation if not paused
                // Time accumulation drives the continuous mathematical evolution of the fractal
                if (!this.animationPaused) {
                    this.parameters.updateTimeAccumulation(deltaTime);
                }

                // RENDER THE FRAME
                // The renderer receives ALL parameters (artistic + mathematical) and creates the visual output
                // This is where mathematics transforms into visual art
                this.renderer.render(this.parameters, {
                    useColorPalette: this.useColorPalette,
                    invertColors: this.invertColors,
                    currentPaletteIndex: this.currentPaletteIndex,
                    debugMode: this.debugMenuVisible,        // Let renderer optimize for exploration vs. presentation
                    frameNumber: this.performanceMetrics.frameCount
                });
                
                // PERFORMANCE TRACKING
                // Monitor performance to help users understand the computational cost of their mathematical choices
                const frameEndTime = performance.now();
                const frameTime = frameEndTime - frameStartTime;
                this.updatePerformanceMetrics(frameTime);
                
                // Continue the rendering loop
                requestAnimationFrame(render);
                
            } catch (error) {
                // Graceful error handling that doesn't crash the entire application
                this.ui.updateStatus(`Render error: ${error.message}`, 'error');
                console.error('Rendering loop error:', error);
                
                // Attempt to continue rendering with a simplified fallback
                setTimeout(() => requestAnimationFrame(render), 100);
            }
        };
        
        // Begin the rendering loop
        render();
        console.log('🎬 Rendering loop started - mathematical visualization active');
    }
    
    // PERFORMANCE METRICS TRACKING
    // This helps users understand the computational complexity of their mathematical explorations
    updatePerformanceMetrics(frameTime) {
        this.performanceMetrics.frameCount++;
        this.performanceMetrics.lastFrameTime = frameTime;
        
        // Calculate rolling average for smooth performance indicators
        const alpha = 0.1; // Smoothing factor
        this.performanceMetrics.averageFrameTime = 
            alpha * frameTime + (1 - alpha) * this.performanceMetrics.averageFrameTime;
    }
    
    // ENHANCED STATE MANAGEMENT SYSTEM
    // This system now handles the complete application state including both artistic and mathematical parameters
    // It's designed to make exploration safe by ensuring everything can be undone
    
    saveStateForUndo() {
        // Create a comprehensive snapshot of the current application state
        // This includes both artistic preferences and mathematical parameter values
        const state = {
            // All parameter values (artistic + mathematical)
            parameters: this.parameters.getState(),
            
            // Visual presentation state
            currentPaletteIndex: this.currentPaletteIndex,
            useColorPalette: this.useColorPalette,
            invertColors: this.invertColors,
            palettes: this.parameters.getPalettesState(),
            
            // Navigation state (for seamless undo/redo experience)
            currentParameterIndex: this.currentParameterIndex,
            currentDebugParameterIndex: this.debugUI.currentDebugParameterIndex,
            
            // Session context for better user feedback
            timestamp: Date.now(),
            debugModeActive: this.debugMenuVisible
        };
        
        this.undoStack.push(state);
        
        // Memory management - prevent unbounded growth
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack since we're creating a new branch of history
        this.redoStack = [];
        
        // Track mathematical exploration activity
        if (this.debugMenuVisible) {
            this.debugParameterChangeCount++;
        }
    }
    
    // UNDO SYSTEM - Enhanced for dual-mode operation
    undo() {
        if (this.undoStack.length === 0) {
            this.ui.updateStatus('Nothing to undo', 'info');
            return;
        }
        
        // Save current state to redo stack before undoing
        const currentState = this.createCurrentStateSnapshot();
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        
        // Provide context-aware feedback
        const modeContext = this.debugMenuVisible ? ' (Debug Mode)' : ' (Normal Mode)';
        this.ui.updateStatus(`⟲ Undone${modeContext} (${this.undoStack.length} steps remaining)`, 'success');
    }
    
    // REDO SYSTEM - Enhanced for dual-mode operation
    redo() {
        if (this.redoStack.length === 0) {
            this.ui.updateStatus('Nothing to redo', 'info');
            return;
        }
        
        // Save current state to undo stack before redoing
        const currentState = this.createCurrentStateSnapshot();
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
        
        // Provide context-aware feedback
        const modeContext = this.debugMenuVisible ? ' (Debug Mode)' : ' (Normal Mode)';
        this.ui.updateStatus(`⟳ Redone${modeContext} (${this.redoStack.length} steps available)`, 'success');
    }
    
    // STATE SNAPSHOT CREATION
    // Creates a complete snapshot of the current application state for undo/redo operations
    createCurrentStateSnapshot() {
        return {
            parameters: this.parameters.getState(),
            currentPaletteIndex: this.currentPaletteIndex,
            useColorPalette: this.useColorPalette,
            invertColors: this.invertColors,
            palettes: this.parameters.getPalettesState(),
            currentParameterIndex: this.currentParameterIndex,
            currentDebugParameterIndex: this.debugUI.currentDebugParameterIndex,
            timestamp: Date.now(),
            debugModeActive: this.debugMenuVisible
        };
    }
    
    // STATE RESTORATION
    // Restores a complete application state from a snapshot
    // This handles both artistic and mathematical parameter restoration seamlessly
    restoreState(state) {
        // Restore all parameter values (both artistic and mathematical)
        this.parameters.setState(state.parameters);
        
        // Restore visual presentation state
        this.currentPaletteIndex = state.currentPaletteIndex;
        this.useColorPalette = state.useColorPalette;
        this.invertColors = state.invertColors;
        
        if (state.palettes) {
            this.parameters.setPalettesState(state.palettes);
        }
        
        // Restore navigation state for seamless user experience
        if (state.currentParameterIndex !== undefined) {
            this.currentParameterIndex = state.currentParameterIndex;
        }
        if (state.currentDebugParameterIndex !== undefined) {
            this.debugUI.currentDebugParameterIndex = state.currentDebugParameterIndex;
        }
        
        // Update all interface elements to reflect the restored state
        this.ui.updateDisplay();
        this.ui.updateMenuDisplay();
        this.debugUI.updateDebugMenuDisplay();
    }
    
    // SYSTEM STATUS AND DIAGNOSTICS
    // Provides comprehensive information about the current state of the application
    // This is invaluable for understanding system behavior and optimizing performance
    getSystemStatus() {
        return {
            // Parameter system status
            regularParameters: this.parameters.parameterKeys.length,
            debugParameters: this.parameters.getAllDebugParameterKeys().length,
            totalParameters: Object.keys(this.parameters.getAllParameters()).length,
            
            // State management status
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            stateMemoryUsage: `${(this.undoStack.length + this.redoStack.length) * 2}KB (estimated)`,
            
            // Operational mode status
            debugModeActive: this.debugMenuVisible,
            animationPaused: this.animationPaused,
            
            // Audio system status
            audioReactive: this.audio.isReactive(),
            microphoneActive: this.audio.microphoneActive,
            audioFileLoaded: this.audio.audioElement !== null,
            
            // Performance status
            averageFrameTime: `${this.performanceMetrics.averageFrameTime.toFixed(2)}ms`,
            estimatedFPS: Math.round(1000 / this.performanceMetrics.averageFrameTime),
            totalFramesRendered: this.performanceMetrics.frameCount,
            
            // Mathematical exploration analytics
            debugParameterChanges: this.debugParameterChangeCount,
            debugModeUsageTime: `${(this.performanceMetrics.debugModeUsageTime / 1000).toFixed(1)}s`
        };
    }
    
    // FALLBACK INITIALIZATION
    // Attempts basic operation even if advanced features fail during initialization
    // This ensures users can still access core functionality even if debug features are unavailable
    attemptFallbackInitialization() {
        try {
            console.log('⚠️ Attempting fallback initialization...');
            
            // Try to initialize just the core artistic functionality
            this.ui.updateStatus('⚠️ Running in limited mode - some features may be unavailable', 'warning');
            
            // Start basic rendering loop without advanced features
            const basicRender = () => {
                if (!this.animationPaused) {
                    this.parameters.updateTimeAccumulation(1.0 / 60.0);
                }
                
                try {
                    this.renderer.render(this.parameters, {
                        useColorPalette: this.useColorPalette,
                        invertColors: this.invertColors,
                        currentPaletteIndex: this.currentPaletteIndex,
                        debugMode: false // Disable debug features in fallback mode
                    });
                } catch (renderError) {
                    console.error('Fallback rendering also failed:', renderError);
                    return; // Stop trying to render
                }
                
                requestAnimationFrame(basicRender);
            };
            
            basicRender();
            console.log('✅ Fallback initialization successful - basic functionality available');
            
        } catch (fallbackError) {
            console.error('Fallback initialization failed:', fallbackError);
            this.ui.updateStatus('❌ System initialization completely failed', 'error');
        }
    }
}

// APPLICATION INITIALIZATION AND STARTUP
// This section handles the application lifecycle and ensures proper startup sequencing

// Create the main application instance
const app = new KaldaoApp();

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
    console.log('🌐 Page loaded - beginning Kaldao initialization...');
    app.init();
});

// Handle page visibility changes for performance optimization
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - could pause expensive operations
        console.log('📱 Page hidden - maintaining background operation');
    } else {
        // Page is visible - resume full operation
        console.log('👁️ Page visible - full operation active');
        app.ui.updateStatus('Welcome back!', 'info');
    }
});

// Export for potential module use and console access
export { KaldaoApp };