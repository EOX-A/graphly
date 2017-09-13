/*
 * Based on WebGL BatchDraw
 * Source: https://github.com/lragnarsson/WebGL-BatchDraw
 * License: MIT
 */


class BatchDrawer {
    constructor(canvas, params) {
        // Define coordinate system "enums"
        this.PIXELS = 0;
        this.NDC = 1;

        // Get optional parameters or defaults
        this.canvas = canvas;
        this.maxLines = params.maxLines === null ? 10000 : params.maxLines;
        this.maxDots = params.maxDots === null ? 10000 : params.maxDots;
        this.maxRects = params.maxRects === null ? 10000 : params.maxRects;
        this.forceGL1 = params.forceGL1 === null ? false : params.forceGL1;
        this.clearColor = params.clearColor === null ? {r: 0, g: 0, b: 0, a: 0} : params.clearColor;
        this.contextParams = params.contextParams === null ? {} : params.contextParams;
        switch(params.coordinateSystem) {
        case null:
        case "pixels":
            this.coordinateSystem = this.PIXELS;
            break;
        case "ndc":
            this.coordinateSystem = this.NDC;
            break;
        default:
            this.error = "Unrecognized coordinate system. Use pixels, ndc or wgs84!";
            console.log(this.error);
            return;
        }

        // Init variables
        this.error = null;
        this.numLines = 0;
        this.numDots = 0;
        this.numRects = 0;

        if (!this._initGLContext()) {
            return;
        }

        // Define attribute locations:
        this.LINE_VX_BUF = 0;
        this.LINE_START_BUF = 1;
        this.LINE_END_BUF = 2;
        this.LINE_WIDTH_BUF = 3;
        this.LINE_COLOR_BUF = 4;

        this.DOT_VX_BUF = 0;
        this.DOT_POS_BUF = 1;
        this.DOT_SIZE_BUF = 2;
        this.DOT_COLOR_BUF = 3;

        this.RECT_VX_BUF = 0;
        this.RECT_START_BUF = 1;
        this.RECT_END_BUF = 2;
        this.RECT_COLOR_BUF = 3;

        if (!this._initShaders()) {
            return;
        }

        this.GL.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);

        this._initBuffers();

        this._initUniforms();
    }


    _initGLContext() {
        this.GL = null;
        this.GLVersion = null;
        if (!this.forceGL1) {
            // Attempt to get a WebGL 2 context:
            try {
                this.GL = this.canvas.getContext("webgl2", this.contextParams);
                this.GLVersion = 2;
            } catch(e) {
                console.log("Could not create a WebGL2 context.");
            }
        }

        // Fallback to WebGL 1:
        if (!this.GL) {
            try {
                this.GL = this.canvas.getContext("webgl", this.contextParams);
                this.ext = this.GL.getExtension("ANGLE_instanced_arrays");
                this.GLVersion = 1;
            } catch(e) {
                console.log("Could not create a WebGL1 context.");
            }
        }

        // Fallback to WebGL experimental (Internet explorer):
        if (!this.GL) {
            try {
                this.GL = this.canvas.getContext("experimental-webgl", this.contextParams);
                this.ext = this.GL.getExtension("ANGLE_instanced_arrays");
                this.GLVersion = 1;
            } catch(e) {
                console.log("Could not create an experimental-WebGL1 context.");
            }
        }

        if (!this.GL) {
            // Could not get anything
            this.error = "Could not initialize a WebGL context.";
            console.log(this.error);
            return false;
        }
        return true;
    }


    _initBuffers() {
        // Initialize constant vertex positions for lines and dots:
        this.lineVertexBuffer = this._initArrayBuffer(new Float32Array([-0.5,  0.5,  1.0,
                                                                        -0.5, -0.5,  1.0,
                                                                         0.5,  0.5,  1.0,
                                                                         0.5, -0.5,  1.0]), 3);
        this.dotVertexBuffer = this._initArrayBuffer(new Float32Array([-0.5,  0.5,  1.0,
                                                                        -0.5, -0.5,  1.0,
                                                                         0.5,  0.5,  1.0,
                                                                         0.5, -0.5,  1.0]), 3);
        this.rectVertexBuffer = this._initArrayBuffer(new Float32Array([-0.5,  0.5,  1.0,
                                                                        -0.5, -0.5,  1.0,
                                                                         0.5,  0.5,  1.0,
                                                                         0.5, -0.5,  1.0]), 3);

        // Initialize Float32Arrays for CPU storage:
        this.lineStartArray = new Float32Array(this.maxLines * 2);
        this.lineEndArray = new Float32Array(this.maxLines * 2);
        this.lineWidthArray = new Float32Array(this.maxLines);
        this.lineColorArray = new Float32Array(this.maxLines * 4);

        this.dotPosArray = new Float32Array(this.maxDots * 2);
        this.dotSizeArray = new Float32Array(this.maxDots);
        this.dotColorArray = new Float32Array(this.maxDots * 4);

        this.rectStartArray = new Float32Array(this.maxRects * 2);
        this.rectEndArray = new Float32Array(this.maxRects * 2);
        this.rectColorArray = new Float32Array(this.maxRects * 4);

        // Initialize Empty WebGL buffers:
        this.lineStartBuffer = this._initArrayBuffer(this.lineStartArray, 2);
        this.lineEndBuffer = this._initArrayBuffer(this.lineEndArray, 2);
        this.lineWidthBuffer = this._initArrayBuffer(this.lineWidthArray, 1);
        this.lineColorBuffer = this._initArrayBuffer(this.lineColorArray, 4);

        this.dotPosBuffer = this._initArrayBuffer(this.dotPosArray, 2);
        this.dotSizeBuffer = this._initArrayBuffer(this.dotSizeArray, 1);
        this.dotColorBuffer = this._initArrayBuffer(this.dotColorArray, 4);

        this.rectStartBuffer = this._initArrayBuffer(this.rectStartArray, 2);
        this.rectEndBuffer = this._initArrayBuffer(this.rectEndArray, 2);
        this.rectColorBuffer = this._initArrayBuffer(this.rectColorArray, 4);
    }



    _initArrayBuffer(data, item_size) {
        let buffer = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, buffer);
        this.GL.bufferData(this.GL.ARRAY_BUFFER, data, this.GL.DYNAMIC_DRAW);
        return buffer;
    }


    _createShaderProgram(vertexSource, fragmentSource, shape) {
        let vertexShader = this._compileShader(vertexSource, this.GL.VERTEX_SHADER);
        let fragmentShader = this._compileShader(fragmentSource, this.GL.FRAGMENT_SHADER);
        if (!vertexShader || ! fragmentShader) {
            return false;
        }

        let program = this.GL.createProgram();

        // Bind attribute locations for this shape:
        if (shape === 'line') {
            this.GL.bindAttribLocation(program, this.LINE_VX_BUF, 'vertexPos');
            this.GL.bindAttribLocation(program, this.LINE_START_BUF, 'inLineStart');
            this.GL.bindAttribLocation(program, this.LINE_END_BUF, 'inLineEnd');
            this.GL.bindAttribLocation(program, this.LINE_WIDTH_BUF, 'inLineWidth');
            this.GL.bindAttribLocation(program, this.LINE_COLOR_BUF, 'lineColor');
        } else if (shape === 'dot') {
            this.GL.bindAttribLocation(program, this.DOT_VX_BUF, 'vertexPos');
            this.GL.bindAttribLocation(program, this.DOT_POS_BUF, 'inDotPos');
            this.GL.bindAttribLocation(program, this.DOT_SIZE_BUF, 'inDotSize');
            this.GL.bindAttribLocation(program, this.DOT_COLOR_BUF, 'dotColor');
        } else if (shape === 'rect') {
            this.GL.bindAttribLocation(program, this.RECT_VX_BUF, 'vertexPos');
            this.GL.bindAttribLocation(program, this.RECT_START_BUF, 'inRectStart');
            this.GL.bindAttribLocation(program, this.RECT_END_BUF, 'inRectEnd');
            this.GL.bindAttribLocation(program, this.RECT_COLOR_BUF, 'rectColor');
        }

        this.GL.attachShader(program, vertexShader);
        this.GL.attachShader(program, fragmentShader);
        this.GL.linkProgram(program);

        if (!this.GL.getProgramParameter(program, this.GL.LINK_STATUS)) {
            this.error = "Could not link shaders: " + this.GL.getProgramInfoLog(program);
            console.log(this.error);
            return false;
        }
        return program;
    }


    _compileShader(shaderSource, shaderType) {
        let shader = this.GL.createShader(shaderType);
        this.GL.shaderSource(shader, shaderSource);
        this.GL.compileShader(shader);

        if (!this.GL.getShaderParameter(shader, this.GL.COMPILE_STATUS)) {
            this.error = "Could not compile shader: " + this.GL.getShaderInfoLog(shader);
            console.log(this.error);
            return null;
        }
        return shader;
    }


    _initUniforms() {
        let projection = new Float32Array([2 / this.canvas.width, 0, 0,
                                           0, -2 / this.canvas.height, 0,
                                          -1, 1, 1]);
        let resScaleX = 1;
        let resScaleY = 1;
        if (this.coordinateSystem == this.NDC) {
            resScaleX = this.canvas.width;
            resScaleY = this.canvas.height;
        }

        this.GL.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.GL.useProgram(this.lineProgram);
        let lineProjLoc = this.GL.getUniformLocation(this.lineProgram, 'projection');
        this.GL.uniformMatrix3fv(lineProjLoc, false, projection);

        let lineResLoc = this.GL.getUniformLocation(this.lineProgram, 'resolutionScale');
        this.GL.uniform2f(lineResLoc, resScaleX, resScaleY);


        this.GL.useProgram(this.dotProgram);
        let dotProjLoc = this.GL.getUniformLocation(this.dotProgram, 'projection');
        this.GL.uniformMatrix3fv(dotProjLoc, false, projection);

        let dotResLoc = this.GL.getUniformLocation(this.dotProgram, 'resolutionScale');
        this.GL.uniform2f(dotResLoc, resScaleX, resScaleY);


        this.GL.useProgram(this.rectProgram);
        let rectProjLoc = this.GL.getUniformLocation(this.rectProgram, 'projection');
        this.GL.uniformMatrix3fv(rectProjLoc, false, projection);

        let rectResLoc = this.GL.getUniformLocation(this.rectProgram, 'resolutionScale');
        this.GL.uniform2f(rectResLoc, resScaleX, resScaleY);

    }


    updateCanvasSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this._initUniforms();
    }

    getContext(){
        return this.GL;
    }



    addLine(startX, startY, endX, endY, width, colorR, colorG, colorB, colorA) {
        this.lineStartArray[2*this.numLines] = startX;
        this.lineStartArray[2*this.numLines+1] = startY;
        this.lineEndArray[2*this.numLines] = endX;
        this.lineEndArray[2*this.numLines+1] = endY;
        this.lineWidthArray[this.numLines] = width;
        this.lineColorArray[4*this.numLines] = colorR;
        this.lineColorArray[4*this.numLines+1] = colorG;
        this.lineColorArray[4*this.numLines+2] = colorB;
        this.lineColorArray[4*this.numLines+3] = colorA;
        this.numLines++;
    }


    addDot(posX, posY, size, colorR, colorG, colorB, colorA) {
        this.dotPosArray[2*this.numDots] = posX;
        this.dotPosArray[2*this.numDots+1] = posY;
        this.dotSizeArray[this.numDots] = size;
        this.dotColorArray[4*this.numDots] = colorR;
        this.dotColorArray[4*this.numDots+1] = colorG;
        this.dotColorArray[4*this.numDots+2] = colorB;
        this.dotColorArray[4*this.numDots+3] = colorA;
        this.numDots++;
    }

    addRect(startX, startY, endX, endY, colorR, colorG, colorB, colorA) {
        this.rectStartArray[2*this.numRects] = startX;
        this.rectStartArray[2*this.numRects+1] = startY;
        this.rectEndArray[2*this.numRects] = endX;
        this.rectEndArray[2*this.numRects+1] = endY;
        this.rectColorArray[4*this.numRects] = colorR;
        this.rectColorArray[4*this.numRects+1] = colorG;
        this.rectColorArray[4*this.numRects+2] = colorB;
        this.rectColorArray[4*this.numRects+3] = colorA;
        this.numRects++;
    }


    draw(keepOld) {
        keepOld = keepOld == null ? false : keepOld;

        // Clear screen:
        this.GL.clear(this.GL.COLOR_BUFFER_BIT);

        if (this.GLVersion == 2) {
            if (this.numLines > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateLineBuffers();
                this._drawLinesGL2();
            }
            if (this.numDots > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateDotBuffers();
                this._drawDotsGL2();
            }
            if (this.numRects > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateRectBuffers();
                this._drawRectsGL2();
            }
        } else if (this.GLVersion == 1) {
            if (this.numLines > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateLineBuffers();
                this._drawLinesGL1();
            }
            if (this.numDots > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateDotBuffers();
                this._drawDotsGL1();
            }
            if (this.numRects > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateRectBuffers();
                this._drawRectsGL1();
            }
        }
        if (!keepOld) {
            // Don't keep old elements for next draw call
            this.numLines = 0;
            this.numDots = 0;
            this.numRects = 0;
        }
    }


    _updateLineBuffers() {
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineStartBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.lineStartArray, 0, this.numLines * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineEndBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.lineEndArray , 0, this.numLines * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineWidthBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.lineWidthArray , 0, this.numLines * 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineColorBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.lineColorArray , 0, this.numLines * 4);
    }


    _updateDotBuffers() {
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotPosBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotPosArray, 0, this.numDots * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotSizeBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotSizeArray, 0, this.numDots * 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotColorBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotColorArray, 0, this.numDots * 4);
    }

    _updateRectBuffers() {
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectStartBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectStartArray, 0, this.numRects * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectEndBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectEndArray , 0, this.numRects * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectColorBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectColorArray, 0, this.numRects * 4);
    }


    _drawLinesGL2() {
        // Use line drawing shaders:
        this.GL.useProgram(this.lineProgram);

        this.GL.enableVertexAttribArray(this.LINE_VX_BUF);
        this.GL.enableVertexAttribArray(this.LINE_START_BUF);
        this.GL.enableVertexAttribArray(this.LINE_END_BUF);
        this.GL.enableVertexAttribArray(this.LINE_WIDTH_BUF);
        this.GL.enableVertexAttribArray(this.LINE_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineVertexBuffer);
        this.GL.vertexAttribPointer(this.LINE_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineStartBuffer);
        this.GL.vertexAttribPointer(this.LINE_START_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.GL.vertexAttribDivisor(this.LINE_START_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineEndBuffer);
        this.GL.vertexAttribPointer(this.LINE_END_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.GL.vertexAttribDivisor(this.LINE_END_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineWidthBuffer);
        this.GL.vertexAttribPointer(this.LINE_WIDTH_BUF, 1, this.GL.FLOAT, false, 4, 0);
        this.GL.vertexAttribDivisor(this.LINE_WIDTH_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineColorBuffer);
        this.GL.vertexAttribPointer(this.LINE_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.GL.vertexAttribDivisor(this.LINE_COLOR_BUF, 1);

        // Draw all line instances:
        this.GL.drawArraysInstanced(this.GL.TRIANGLE_STRIP, 0, 4, this.numLines);
    }


    _drawDotsGL2() {
        // Use dot drawing shaders:
        this.GL.useProgram(this.dotProgram);

        //this.GL.blendFuncSeparate(this.GL.SRC_ALPHA, this.GL.ONE_MINUS_SRC_ALPHA, this.GL.ONE, this.GL.ONE_MINUS_SRC_ALPHA);
        this.GL.blendFunc(this.GL.ONE, this.GL.ONE_MINUS_SRC_ALPHA);
        this.GL.enable(this.GL.BLEND);

        this.GL.enableVertexAttribArray(this.DOT_VX_BUF);
        this.GL.enableVertexAttribArray(this.DOT_POS_BUF);
        this.GL.enableVertexAttribArray(this.DOT_SIZE_BUF);
        this.GL.enableVertexAttribArray(this.DOT_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotVertexBuffer);
        this.GL.vertexAttribPointer(this.DOT_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotPosBuffer);
        this.GL.vertexAttribPointer(this.DOT_POS_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.GL.vertexAttribDivisor(this.DOT_POS_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotSizeBuffer);
        this.GL.vertexAttribPointer(this.DOT_SIZE_BUF, 1, this.GL.FLOAT, false, 4, 0);
        this.GL.vertexAttribDivisor(this.DOT_SIZE_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotColorBuffer);
        this.GL.vertexAttribPointer(this.DOT_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.GL.vertexAttribDivisor(this.DOT_COLOR_BUF, 1);

        // Draw all dot instances:
        this.GL.drawArraysInstanced(this.GL.POINT, 0, 4, this.numDots);
    }

    _drawRectsGL2() {
        // Use rect drawing shaders:
        this.GL.useProgram(this.rectProgram);

        //this.GL.blendFuncSeparate(this.GL.SRC_ALPHA, this.GL.ONE_MINUS_SRC_ALPHA, this.GL.ONE, this.GL.ONE_MINUS_SRC_ALPHA);
        this.GL.blendFunc(this.GL.ONE, this.GL.ONE_MINUS_SRC_ALPHA);
        this.GL.enable(this.GL.BLEND);

        this.GL.enableVertexAttribArray(this.RECT_VX_BUF);
        this.GL.enableVertexAttribArray(this.RECT_START_BUF);
        this.GL.enableVertexAttribArray(this.RECT_END_BUF);
        this.GL.enableVertexAttribArray(this.RECT_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectVertexBuffer);
        this.GL.vertexAttribPointer(this.RECT_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectStartBuffer);
        this.GL.vertexAttribPointer(this.RECT_START_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.GL.vertexAttribDivisor(this.RECT_START_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectEndBuffer);
        this.GL.vertexAttribPointer(this.RECT_END_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.GL.vertexAttribDivisor(this.RECT_END_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectColorBuffer);
        this.GL.vertexAttribPointer(this.RECT_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.GL.vertexAttribDivisor(this.RECT_COLOR_BUF, 1);

        // Draw all rect instances:
        this.GL.drawArraysInstanced(this.GL.TRIANGLE_STRIP, 0, 4, this.numRects);

    }


    _drawLinesGL1() {
        // Use line drawing shaders:
        this.GL.useProgram(this.lineProgram);

        this.GL.enableVertexAttribArray(this.LINE_VX_BUF);
        this.GL.enableVertexAttribArray(this.LINE_START_BUF);
        this.GL.enableVertexAttribArray(this.LINE_END_BUF);
        this.GL.enableVertexAttribArray(this.LINE_WIDTH_BUF);
        this.GL.enableVertexAttribArray(this.LINE_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineVertexBuffer);
        this.GL.vertexAttribPointer(this.LINE_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineStartBuffer);
        this.GL.vertexAttribPointer(this.LINE_START_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_START_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineEndBuffer);
        this.GL.vertexAttribPointer(this.LINE_END_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_END_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineWidthBuffer);
        this.GL.vertexAttribPointer(this.LINE_WIDTH_BUF, 1, this.GL.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_WIDTH_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineColorBuffer);
        this.GL.vertexAttribPointer(this.LINE_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_COLOR_BUF, 1);

        // Draw all line instances:
        this.ext.drawArraysInstancedANGLE(this.GL.TRIANGLE_STRIP, 0, 4, this.numLines);
    }


    _drawDotsGL1() {
        // Use dot drawing shaders:
        this.GL.useProgram(this.dotProgram);

        this.GL.blendFunc(this.GL.ONE, this.GL.ONE_MINUS_SRC_ALPHA);
        this.GL.enable(this.GL.BLEND);

        this.GL.enableVertexAttribArray(this.DOT_VX_BUF);
        this.GL.enableVertexAttribArray(this.DOT_POS_BUF);
        this.GL.enableVertexAttribArray(this.DOT_SIZE_BUF);
        this.GL.enableVertexAttribArray(this.DOT_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotVertexBuffer);
        this.GL.vertexAttribPointer(this.DOT_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotPosBuffer);
        this.GL.vertexAttribPointer(this.DOT_POS_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_POS_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotSizeBuffer);
        this.GL.vertexAttribPointer(this.DOT_SIZE_BUF, 1, this.GL.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_SIZE_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotColorBuffer);
        this.GL.vertexAttribPointer(this.DOT_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_COLOR_BUF, 1);

        // Draw all dot instances:
        this.ext.drawArraysInstancedANGLE(this.GL.POINT, 0, 4, this.numDots);
    }

    _drawRectsGL1() {

        // Use rect drawing shaders:
        this.GL.useProgram(this.rectProgram);

        this.GL.enableVertexAttribArray(this.RECT_VX_BUF);
        this.GL.enableVertexAttribArray(this.RECT_START_BUF);
        this.GL.enableVertexAttribArray(this.RECT_END_BUF);
        this.GL.enableVertexAttribArray(this.RECT_COLOR_BUF);

        // Bind all line vertex buffers:
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectVertexBuffer);
        this.GL.vertexAttribPointer(this.RECT_VX_BUF, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectStartBuffer);
        this.GL.vertexAttribPointer(this.RECT_START_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_START_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectEndBuffer);
        this.GL.vertexAttribPointer(this.RECT_END_BUF, 2, this.GL.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_END_BUF, 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectColorBuffer);
        this.GL.vertexAttribPointer(this.RECT_COLOR_BUF, 4, this.GL.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_COLOR_BUF, 1);

        // Draw all rect instances:
        this.ext.drawArraysInstancedANGLE(this.GL.TRIANGLE_STRIP, 0, 4, this.numRects);
    }


    _initShaders() {
        // Shader source code based on WebGL version:
        let lineVertexSource = null;
        let dotFragSource = null;
        let lineFragSource = null;
        let dotVertexSource = null;
        let rectFragSource = null;
        let rectVertexSource = null;

        if (this.GLVersion == 2) {
            dotFragSource = 
               `#version 300 es
                #define PI 3.14159265359
                #define TWO_PI 6.28318530718

                precision highp float;
                
                in vec4 color;
                out vec4 fragmentColor;
                
                void main(void) {

                    //fragmentColor = color;
                    //fragmentColor = vec4(color.rgb * color.a, color.a);

                    float border = 0.05;
                    float radius = 0.5;
                    vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
                    vec4 color1 = vec4(color.rgb * color.a, color.a);
                    float dis = 0.0;

                    if(color.a < 0.0){
                        dis = 1.0;
                        color1 = vec4(color.rgb, 1.0);
                    }
                    

                    vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                    float dist = radius - sqrt(m.x * m.x + m.y * m.y);

                    float t = 0.0;
                    if (dist > border){
                        t = 1.0;
                    } else if (dist > 0.0){
                        t = 1.0;
                        if(dis < 0.5){
                            t = dist / border;
                        }else{
                            discard;
                        }
                    }

                    // float centerDist = length(gl_PointCoord - 0.5);
                    // works for overlapping circles if blending is enabled

                    fragmentColor = mix(color0, color1, t);







                    /*vec2 st = 2.0 * gl_PointCoord.xy - 1.0;
                    st.y = st.y * -1.0;
                    vec3 color2 = vec3(0.0);
                    float d = 0.0;

                    // Number of sides of your shape
                    int N = 3;

                    // Angle and radius from the current pixel
                    float a = atan(st.x,st.y)+PI;
                    float r = TWO_PI/float(N);

                    // Shaping function that modulate the distance
                    d = cos(floor(.5+a/r)*r-a)*length(st);
                    float alpha = 1.0-smoothstep(.4,.41,d);
                    fragmentColor = color * alpha;*/


                    /*float innerPercent = 0.5;
                    vec4 outlineColor = color;
                    float distanceToCenter = length(gl_PointCoord.xy - vec2(0.5));
                    //float maxDistance = max(0.0, 0.5 - v_pixelDistance);
                    float maxDistance = 0.4;
                    float wholeAlpha = 1.0 - smoothstep(maxDistance, 0.5, distanceToCenter);
                    float innerAlpha = 1.0 - smoothstep(maxDistance * innerPercent, 0.5 * innerPercent, distanceToCenter);
                    vec4 o_color = mix(outlineColor, color, innerAlpha);
                    o_color.a *= wholeAlpha;
                    if (o_color.a < 0.005){
                        discard;
                    }
                    #ifdef GL_EXT_frag_depth
                        float z = gl_FragCoord.z;
                        gl_FragDepthEXT = z + ((1.0 - z) * (1.0 - wholeAlpha));
                    #endif
                    
                    fragmentColor = o_color;*/



                    /*float r = 0.0, delta = 0.0, alpha = 1.0;
                        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                        r = dot(cxy, cxy);
                    #ifdef GL_OES_standard_derivatives
                        delta = fwidth(r);
                        alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);
                    #endif

                    fragmentColor = color * alpha;*/


                    /*float border = 0.05;
                    float radius = 0.5;
                    vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
                    vec4 color1 = vec4(color[0], color[1], color[2], 1.0);

                    vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                    float dist = radius - sqrt(m.x * m.x + m.y * m.y);

                    float t = 0.0;
                    if (dist > border)
                    t = 1.0;
                    else if (dist > 0.0)
                    t = dist / border;

                    // float centerDist = length(gl_PointCoord - 0.5);
                    // works for overlapping circles if blending is enabled
                    fragmentColor = mix(color0, color1, t);*/


                    
                    /*float r = 0.0, delta = 0.0, alpha = 1.0;
                    vec2 cxy = 2.0 * gl_PointCoord.xy - 1.0;
                    r = dot(cxy, cxy);
                    if (r > 1.0) {
                        discard;
                    } else if (r < 1.0 && r >= 0.9){
                        fragmentColor = color * 0.2;
                    } else {
                        fragmentColor = color;
                    }*/

                    
                }`;

                dotVertexSource =
                    `#version 300 es
                    precision highp float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inDotPos;
                    layout(location = 2) in float inDotSize;
                    layout(location = 3) in vec4 dotColor;

                    out vec4 color;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = dotColor;
                        gl_PointSize =  inDotSize;
                        vec2 dotPos = resolutionScale * inDotPos;
                        float dotSize = resolutionScale.x * inDotSize;
                        mat3 translate = mat3(
                          1, 0, 0,
                          0, 1, 0,
                          dotPos.x, dotPos.y, 1);

                        gl_Position = vec4(projection * translate * vertexPos, 1.0);
                    }`;

                lineFragSource =
                   `#version 300 es
                    precision highp float;
                    in vec4 color;
                    out vec4 fragmentColor;
                    void main(void) {
                        fragmentColor = color;
                }`;
            
                lineVertexSource = 
                   `#version 300 es
                    precision highp float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inLineStart;
                    layout(location = 2) in vec2 inLineEnd;
                    layout(location = 3) in float inLineWidth;
                    layout(location = 4) in vec4 lineColor;

                    out vec4 color;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = lineColor;

                        vec2 lineStart = inLineStart * resolutionScale;
                        vec2 lineEnd = inLineEnd * resolutionScale;
                        float lineWidth = inLineWidth * resolutionScale.x;

                        vec2 delta = lineStart - lineEnd;
                        vec2 centerPos = 0.5 * (lineStart + lineEnd);
                        float lineLength = length(delta);
                        float phi = atan(delta.y/delta.x);

                        mat3 scale = mat3(
                              lineLength, 0, 0,
                              0, lineWidth, 0,
                              0, 0, 1);
                        mat3 rotate = mat3(
                              cos(phi), sin(phi), 0,
                              -sin(phi), cos(phi), 0,
                              0, 0, 1);
                        mat3 translate = mat3(
                              1, 0, 0,
                              0, 1, 0,
                              centerPos.x, centerPos.y, 1);

                        gl_Position = vec4(projection * translate *  rotate *  scale * vertexPos, 1.0);
                }`;

                rectFragSource =
                   `#version 300 es
                    precision highp float;
                    in vec4 color;
                    out vec4 fragmentColor;
                    void main(void) {
                        fragmentColor = vec4(color.rgb * color.a, color.a);
                }`;
            
                rectVertexSource = 
                   `#version 300 es
                    #define M_PI 3.1415926535897932384626433832795
                    precision highp float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inRectStart;
                    layout(location = 2) in vec2 inRectEnd;
                    layout(location = 3) in vec4 rectColor;

                    out vec4 color;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = rectColor;

                        vec2 rectStart = inRectStart * resolutionScale;
                        vec2 rectEnd = inRectEnd * resolutionScale;

                        float rectWidth = abs(rectEnd.x - rectStart.x);
                        float rectHeight = abs(rectEnd.y - rectStart.y);

                        vec2 centerPos = 0.5 * (rectStart + rectEnd);

                        mat3 scale = mat3(
                              rectWidth, 0, 0,
                              0, rectHeight, 0,
                              0, 0, 1);

                        mat3 translate = mat3(
                              1, 0, 0,
                              0, 1, 0,
                              centerPos.x, centerPos.y, 1);

                        gl_Position = vec4(projection *  translate *  scale *  vertexPos, 1.0);
                }`;

        } else if (this.GLVersion == 1) {
            dotFragSource = 
               `#version 100
                precision highp float;
                varying vec4 color;
                void main(void) {
                    float border = 0.05;
                    float radius = 0.5;
                    vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
                    vec4 color1 = vec4(color.rgb * color.a, color.a);
                    float dis = 0.0;

                    if(color.a < 0.0){
                        dis = 1.0;
                        color1 = vec4(color.rgb, 1.0);
                    }
                

                    vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                    float dist = radius - sqrt(m.x * m.x + m.y * m.y);

                    float t = 0.0;
                    if (dist > border){
                        t = 1.0;
                    } else if (dist > 0.0){
                        t = 1.0;
                        if(dis < 0.5){
                            t = dist / border;
                        }else{
                            discard;
                        }
                    }

                    // float centerDist = length(gl_PointCoord - 0.5);
                    // works for overlapping circles if blending is enabled

                    gl_FragColor = mix(color0, color1, t);
                }`;

            lineFragSource =
                `#version 100
                precision highp float;
                varying vec4 color;

                void main(void) {
                    gl_FragColor = color;
                }`;

            lineVertexSource = 
                `#version 100
                precision highp float;

                attribute vec3 vertexPos;
                attribute vec2 inLineStart;
                attribute vec2 inLineEnd;
                attribute float inLineWidth;
                attribute vec4 lineColor;

                varying vec4 color;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = lineColor;

                    vec2 lineStart = inLineStart * resolutionScale;
                    vec2 lineEnd = inLineEnd * resolutionScale;
                    float lineWidth = inLineWidth * resolutionScale.x;

                    vec2 delta = lineStart - lineEnd;
                    vec2 centerPos = 0.5 * (lineStart + lineEnd);
                    float lineLength = length(delta);
                    float phi = atan(delta.y/delta.x);

                    mat3 scale = mat3(
                          lineLength, 0, 0,
                          0, lineWidth, 0,
                          0, 0, 1);
                    mat3 rotate = mat3(
                          cos(phi), sin(phi), 0,
                          -sin(phi), cos(phi), 0,
                          0, 0, 1);
                    mat3 translate = mat3(
                          1, 0, 0,
                          0, 1, 0,
                          centerPos.x, centerPos.y, 1);

                    gl_Position = vec4(projection * translate *  rotate *  scale * vertexPos, 1.0);
                }`;

            dotVertexSource = 
                `#version 100
                precision highp float;

                attribute vec3 vertexPos;
                attribute vec2 inDotPos;
                attribute float inDotSize;
                attribute vec4 dotColor;

                varying vec4 color;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = dotColor;
                    gl_PointSize =  10.0;
                    vec2 dotPos = resolutionScale * inDotPos;
                    float dotSize = resolutionScale.x * inDotSize;
                    mat3 translate = mat3(
                      1, 0, 0,
                      0, 1, 0,
                      dotPos.x, dotPos.y, 1);

                    gl_Position = vec4(projection * translate * vertexPos, 1.0);
                }`;

            rectFragSource =
                `#version 100
                precision highp float;
                varying vec4 color;

                void main(void) {
                    gl_FragColor = vec4(color.rgb * color.a, color.a);
                }`;
                
            rectVertexSource = 
               `#version 100
                precision highp float;

                attribute vec3 vertexPos;
                attribute vec2 inRectStart;
                attribute vec2 inRectEnd;
                attribute vec4 rectColor;

                varying vec4 color;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = rectColor;

                    vec2 rectStart = inRectStart * resolutionScale;
                    vec2 rectEnd = inRectEnd * resolutionScale;

                    float rectWidth = abs(rectEnd.x - rectStart.x);
                    float rectHeight = abs(rectEnd.y - rectStart.y);

                    vec2 centerPos = 0.5 * (rectStart + rectEnd);

                    mat3 scale = mat3(
                          rectWidth, 0, 0,
                          0, rectHeight, 0,
                          0, 0, 1);

                    mat3 translate = mat3(
                          1, 0, 0,
                          0, 1, 0,
                          centerPos.x, centerPos.y, 1);

                    gl_Position = vec4(projection *  translate *  scale *  vertexPos, 1.0);
                }`;
        }

        this.lineProgram = this._createShaderProgram(lineVertexSource, lineFragSource, 'line');
        this.dotProgram = this._createShaderProgram(dotVertexSource, dotFragSource, 'dot');
        this.rectProgram = this._createShaderProgram(rectVertexSource, rectFragSource, 'rect');
        return (this.lineProgram != false && this.dotProgram != false && this.rectProgram != false);
    }
}

module.exports = BatchDrawer; 