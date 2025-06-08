// ====================
// VERTEX SHADER - Sets up full-screen quad
// ====================
// This shader runs once per vertex (4 times total for our full-screen quad)
// Its job is simply to position the vertices to cover the entire screen
// All the visual magic happens in the fragment shader

attribute vec2 a_position;  // Input: corner positions of our quad (-1 to 1)

void main() {
    // Pass the position directly through - no transformations needed
    // This creates a quad that covers the entire screen in normalized device coordinates
    gl_Position = vec4(a_position, 0.0, 1.0);
}