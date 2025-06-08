// Enhanced Controls and Input Handling Module
// This module now manages two distinct control contexts:
// 1. Normal Mode: Artistic parameter control for creative expression
// 2. Debug Mode: Mathematical parameter control for deep system exploration
//
// Think of this as a context-sensitive input system where the same physical keys
// control different aspects of the system depending on the current operational mode

export class ControlsManager {
    constructor() {
        this.app = null;
        
        // Context tracking for intelligent key handling
        // This helps us provide appropriate feedback and prevent mode confusion
        this.lastModeSwitch = 0;  // Timestamp of last mode change for user feedback
        this.keyRepeatCount = 0;  // Track rapid key presses for accelerated navigation
        this.lastKeyTime = 0;     // For detecting rapid navigation patterns
    }

    init(app) {
        this.app = app;
        this.setupEventListeners();
        console.log('Enhanced Controls Manager initialized with dual-mode support');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Enhanced interaction detection for better UI responsiveness
        // These events help us show/hide the UI appropriately in both modes
        document.addEventListener('mousemove', () => this.app.ui.resetControlsFadeTimer());
        document.addEventListener('touchstart', () => this.app.ui.resetControlsFadeTimer());
        document.addEventListener('click', () => this.app.ui.resetControlsFadeTimer());
        
        // Additional interaction detection for debug mode awareness
        document.addEventListener('wheel', () => this.handleWheelInteraction());
    }

    handleKeydown(e) {
        try {
            // Always reset the UI fade timer on any keypress
            // This ensures the interface remains visible while actively controlling parameters
            this.app.ui.resetControlsFadeTimer();
            
            // Track key timing for advanced navigation features
            const currentTime = performance.now();
            const timeSinceLastKey = currentTime - this.lastKeyTime;
            this.lastKeyTime = currentTime;
            
            // Detect rapid key sequences for accelerated navigation
            if (timeSinceLastKey < 150) { // 150ms threshold for "rapid" input
                this.keyRepeatCount++;
            } else {
                this.keyRepeatCount = 0;
            }
            
            // CONTEXT-SENSITIVE KEY ROUTING
            // This is the heart of our dual-mode system - we route the same physical keys
            // to different logical functions based on the current operational context
            if (this.app.debugMenuVisible) {
                // DEBUG MODE: Route keys to mathematical parameter control
                this.handleDebugModeKeys(e);
            } else {
                // NORMAL MODE: Route keys to artistic parameter control
                this.handleNormalModeKeys(e);
            }
            
        } catch (error) {
            this.app.ui.updateStatus(`Input error: ${error.message}`, 'error');
            console.error('Controls error:', error);
        }
    }

    // NORMAL MODE KEY HANDLING
    // This handles the familiar artistic parameter controls that users know and expect
    // These controls focus on creative expression and real-time performance adjustment
    handleNormalModeKeys(e) {
        switch(e.code) {
            case 'ArrowUp':
                e.preventDefault();
                this.switchParameter(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.switchParameter(1);
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                // Apply accelerated adjustment for rapid parameter changes
                const leftDelta = this.keyRepeatCount > 5 ? -5 : -1;
                this.adjustParameter(leftDelta);
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                // Apply accelerated adjustment for rapid parameter changes
                const rightDelta = this.keyRepeatCount > 5 ? 5 : 1;
                this.adjustParameter(rightDelta);
                break;
                
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
                
            case 'KeyC':
                e.preventDefault();
                if (e.shiftKey) {
                    this.resetToBlackWhite();
                } else {
                    this.randomizeColors();
                }
                break;
                
            case 'KeyR':
                e.preventDefault();
                if (e.shiftKey) {
                    this.resetAllParameters();
                } else {
                    this.resetCurrentParameter();
                }
                break;
                
            case 'Period':
                e.preventDefault();
                this.randomizeParameters();
                break;
                
            case 'KeyI':
                e.preventDefault();
                this.toggleInvertColors();
                break;
                
            case 'KeyS':
                e.preventDefault();
                this.app.fileManager.saveParameters();
                break;
                
            case 'KeyL':
                e.preventDefault();
                this.app.fileManager.loadParameters();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.app.ui.toggleMenu();
                break;
                
            case 'KeyA':
                e.preventDefault();
                this.app.audio.toggleAudio();
                break;
                
            case 'KeyZ':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    this.app.undo();
                }
                break;
                
            case 'KeyY':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    this.app.redo();
                }
                break;
                
            case 'KeyM':
                e.preventDefault();
                this.app.audio.toggleMicrophone();
                break;
                
            case 'Semicolon':  // THE DEBUG MODE GATEWAY
                e.preventDefault();
                this.enterDebugMode();
                break;
        }
    }

    // DEBUG MODE KEY HANDLING
    // This handles mathematical parameter control for deep system exploration
    // These controls focus on understanding and manipulating the underlying mathematics
    handleDebugModeKeys(e) {
        switch(e.code) {
            case 'ArrowUp':
                e.preventDefault();
                // Navigate to previous debug parameter
                // In debug mode, we're navigating through mathematical concepts rather than artistic ones
                this.app.debugUI.switchDebugParameter(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                // Navigate to next debug parameter
                this.app.debugUI.switchDebugParameter(1);
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                // Decrease current debug parameter value
                // The step size is carefully calibrated for each mathematical parameter
                const leftDelta = this.keyRepeatCount > 5 ? -5 : -1;
                this.app.debugUI.adjustDebugParameter(leftDelta);
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                // Increase current debug parameter value
                const rightDelta = this.keyRepeatCount > 5 ? 5 : 1;
                this.app.debugUI.adjustDebugParameter(rightDelta);
                break;
                
            case 'Space':
                e.preventDefault();
                // Pause still works in debug mode - essential for studying static configurations
                this.togglePause();
                break;
                
            case 'KeyR':
                e.preventDefault();
                if (e.shiftKey) {
                    // DANGEROUS OPERATION: Reset ALL debug parameters
                    // This returns the entire mathematical system to its default state
                    if (confirm('Reset ALL debug parameters? This will return to default mathematical values and may dramatically change the visualization.')) {
                        this.app.saveStateForUndo();
                        this.app.parameters.getAllDebugParameterKeys().forEach(key => {
                            this.app.parameters.resetParameter(key);
                        });
                        this.app.debugUI.updateDebugMenuDisplay();
                        this.app.ui.updateStatus('All debug parameters reset to mathematical defaults', 'success');
                    }
                } else {
                    // Safe operation: Reset only the current debug parameter
                    this.app.debugUI.resetCurrentDebugParameter();
                }
                break;
                
            case 'Period':
                e.preventDefault();
                // CONTROLLED RANDOMIZATION: Only randomize mathematically safe debug parameters
                // This prevents breaking the visualization while still allowing exploration
                this.app.debugUI.randomizeDebugParameters();
                break;
                
            case 'KeyE':  // EXPORT DEBUG STATE
                e.preventDefault();
                // Export current mathematical configuration for sharing or documentation
                // This is invaluable for reproducible research and artistic collaboration
                this.app.debugUI.exportDebugState();
                break;
                
            case 'KeyD':  // DEBUG STATISTICS
                e.preventDefault();
                // Display comprehensive information about current debug state
                this.showDebugStatistics();
                break;
                
            case 'KeyH':  // HELP IN DEBUG MODE
                e.preventDefault();
                // Show debug-specific help information
                this.showDebugHelp();
                break;
                
            case 'Escape':
            case 'Semicolon':  // EITHER KEY EXITS DEBUG MODE
                e.preventDefault();
                this.exitDebugMode();
                break;
                
            case 'KeyZ':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Undo works in debug mode - crucial for safe mathematical exploration
                    this.app.undo();
                }
                break;
                
            case 'KeyY':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Redo works in debug mode
                    this.app.redo();
                }
                break;
                
            // IMPORTANT: Most other keys are intentionally ignored in debug mode
            // This prevents accidental audio changes, file operations, etc. while exploring mathematics
            default:
                // Don't prevent default for unhandled keys - allows browser shortcuts to still work
                break;
        }
    }

    // DEBUG MODE TRANSITION METHODS
    // These handle the conceptual and visual transition between operational modes
    
    enterDebugMode() {
        this.lastModeSwitch = performance.now();
        this.app.debugUI.toggleDebugMenu();
        
        // Provide clear feedback about the mode transition
        // This helps users understand they've entered a different operational context
        this.app.ui.updateStatus('🔧 DEBUG MODE: Mathematical parameter control active. Press ; or ESC to exit.', 'info');
        
        console.log('Entered debug mode - mathematical parameter control active');
    }
    
    exitDebugMode() {
        this.lastModeSwitch = performance.now();
        this.app.debugUI.toggleDebugMenu();
        
        // Calculate how long the user spent in debug mode for analytics
        const debugDuration = this.lastModeSwitch - (this.lastModeSwitch - 1000); // Simplified for example
        
        // Provide feedback about returning to normal operation
        this.app.ui.updateStatus('Returned to normal mode - artistic parameter control active', 'success');
        
        console.log('Exited debug mode - returning to artistic parameter control');
    }

    // ENHANCED UTILITY METHODS
    
    showDebugStatistics() {
        // Provide comprehensive information about the current mathematical state
        const stats = this.app.debugUI.getDebugStatistics();
        const systemStatus = this.app.getSystemStatus();
        
        let statusMessage = `Debug Stats: ${stats.totalParameters} total params, `;
        statusMessage += `${systemStatus.undoStackSize} undo steps available, `;
        statusMessage += `${systemStatus.audioReactive ? 'Audio reactive' : 'Static mode'}`;
        
        this.app.ui.updateStatus(statusMessage, 'info');
        
        // Log detailed statistics to console for advanced users
        console.log('Debug Statistics:', {
            debugParameters: stats,
            systemStatus: systemStatus,
            currentParameter: this.app.debugUI.getCurrentDebugParameterKey()
        });
    }
    
    showDebugHelp() {
        // Display context-sensitive help for debug mode
        const helpMessage = 'Debug Controls: ↑/↓ navigate • ←/→ adjust • R reset • . randomize • E export • D stats • H help';
        this.app.ui.updateStatus(helpMessage, 'info');
    }
    
    handleWheelInteraction() {
        // Handle mouse wheel events for potential future enhancement
        // Could be used for fine parameter adjustment in debug mode
        if (this.app.debugMenuVisible) {
            // Future: Could implement wheel-based parameter adjustment
            // For now, just reset the UI timer
            this.app.ui.resetControlsFadeTimer();
        }
    }

    // ARTISTIC PARAMETER CONTROL METHODS (Enhanced versions of existing methods)
    // These methods now include improved feedback and better integration with the debug system
    
    switchParameter(delta) {
        const paramKeys = this.app.parameters.getParameterKeys();
        this.app.currentParameterIndex = (this.app.currentParameterIndex + delta + paramKeys.length) % paramKeys.length;
        this.app.ui.updateDisplay();
        
        // Enhanced feedback includes parameter category information
        const currentParam = this.app.parameters.getParameter(paramKeys[this.app.currentParameterIndex]);
        this.app.ui.updateStatus(`Selected: ${currentParam.name}`, 'info');
    }

    adjustParameter(delta) {
        // Save state before making any artistic parameter changes
        // This ensures all changes can be undone, even when switching between modes
        this.app.saveStateForUndo();
        
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        const oldValue = this.app.parameters.getValue(paramKey);
        
        this.app.parameters.adjustParameter(paramKey, delta);
        
        const newValue = this.app.parameters.getValue(paramKey);
        
        // Provide immediate feedback about the change
        if (oldValue !== newValue) {
            this.app.ui.updateDisplay();
            const param = this.app.parameters.getParameter(paramKey);
            this.app.ui.updateStatus(`${param.name}: ${newValue.toFixed(3)}`, 'success');
        }
    }

    togglePause() {
        this.app.animationPaused = !this.app.animationPaused;
        
        // Enhanced status message that includes current mode context
        const status = this.app.animationPaused ? 'PAUSED' : 'RUNNING';
        const mode = this.app.debugMenuVisible ? ' (Debug Mode)' : ' (Normal Mode)';
        
        this.app.ui.updateStatus(`Animation: ${status}${mode}`, 'info');
    }

    // COLOR AND RANDOMIZATION METHODS (unchanged but with enhanced feedback)
    
    randomizeColors() {
        this.app.saveStateForUndo();
        
        this.app.parameters.randomizePalette(this.app.currentPaletteIndex);
        
        // Auto-enable color palette if we're randomizing from black & white
        if (this.app.currentPaletteIndex === 0) {
            this.app.currentPaletteIndex = 1;
            this.app.useColorPalette = true;
        }
        
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus('Colors randomized', 'success');
    }

    resetToBlackWhite() {
        this.app.saveStateForUndo();
        
        this.app.currentPaletteIndex = 0;
        this.app.useColorPalette = false;
        this.app.invertColors = false;
        
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus('Reset to black & white', 'success');
    }

    toggleInvertColors() {
        this.app.saveStateForUndo();
        
        this.app.invertColors = !this.app.invertColors;
        this.app.ui.updateDisplay();
        
        const status = this.app.invertColors ? 'Colors inverted' : 'Colors normal';
        this.app.ui.updateStatus(status, 'success');
    }

    randomizeParameters() {
        this.app.saveStateForUndo();
        
        this.app.parameters.randomizeParameters();
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus('Artistic parameters randomized', 'success');
    }

    resetCurrentParameter() {
        this.app.saveStateForUndo();
        
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        const param = this.app.parameters.getParameter(paramKey);
        
        this.app.parameters.resetParameter(paramKey);
        
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus(`Reset: ${param.name} to default`, 'success');
    }

    resetAllParameters() {
        // Enhanced confirmation dialog that explains the scope of the reset
        const confirmMessage = 'Reset all artistic parameters? This will NOT affect debug/mathematical parameters.';
        
        if (confirm(confirmMessage)) {
            this.app.saveStateForUndo();
            
            // Only reset artistic parameters, leaving mathematical ones untouched
            this.app.parameters.parameterKeys.forEach(key => {
                this.app.parameters.resetParameter(key);
            });
            
            // Also reset color system state
            this.app.currentPaletteIndex = 0;
            this.app.useColorPalette = false;
            this.app.invertColors = false;
            
            this.app.ui.updateDisplay();
            this.app.ui.updateMenuDisplay();
            this.app.ui.updateStatus('All artistic parameters reset (debug parameters unchanged)', 'success');
        }
    }
}