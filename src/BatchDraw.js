/*
 * Based on WebGL BatchDraw
 * Source: https://github.com/lragnarsson/WebGL-BatchDraw
 * License: MIT
 */



function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

class BatchDrawer {
    constructor(canvas, params) {
        // Define coordinate system "enums"
        this.PIXELS = 0;
        this.NDC = 1;

        // Get optional parameters or defaults
        this.canvas = canvas;
        this.maxLines = defaultFor(params.maxLines, 10000);
        this.maxDots = defaultFor(params.maxDots, 10000); 
        this.maxRects = defaultFor(params.maxRects, 10000); 
        this.forceGL1 = defaultFor(params.forceGL1, false); 
        this.clearColor = defaultFor(params.clearColor, {r: 0, g: 0, b: 0, a: 0});
        this.contextParams = defaultFor(params.contextParams, {});

        let colorscalesdef = require('colorscalesdef');
        this.colorscales = colorscalesdef.colorscales;

        this.setNoDataValue(Number.MIN_VALUE);
        this.setLogScale(false);
        this.setDomain([0,1]);
        
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
        this.LINE_VALUE_BUF = 5;

        this.DOT_VX_BUF = 0;
        this.DOT_POS_BUF = 1;
        this.DOT_SIZE_BUF = 2;
        this.DOT_COLOR_BUF = 3;
        this.DOT_TYPE_BUF = 4;
        this.DOT_VALUE_BUF = 5;

        this.RECT_VX_BUF = 0;
        this.RECT_START_BUF = 1;
        this.RECT_END_BUF = 2;
        this.RECT_COLOR_BUF = 3;
        this.RECT_VALUE_BUF = 4;

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
        this.lineValueArray = new Float32Array(this.maxLines);

        this.dotPosArray = new Float32Array(this.maxDots * 2);
        this.dotSizeArray = new Float32Array(this.maxDots);
        this.dotColorArray = new Float32Array(this.maxDots * 4);
        this.dotTypeArray = new Float32Array(this.maxDots);
        this.dotValueArray = new Float32Array(this.maxDots);

        this.rectStartArray = new Float32Array(this.maxRects * 2);
        this.rectEndArray = new Float32Array(this.maxRects * 2);
        this.rectColorArray = new Float32Array(this.maxRects * 4);
        this.rectValueArray = new Float32Array(this.maxRects);

        // Initialize Empty WebGL buffers:
        this.lineStartBuffer = this._initArrayBuffer(this.lineStartArray, 2);
        this.lineEndBuffer = this._initArrayBuffer(this.lineEndArray, 2);
        this.lineWidthBuffer = this._initArrayBuffer(this.lineWidthArray, 1);
        this.lineColorBuffer = this._initArrayBuffer(this.lineColorArray, 4);
        this.lineValueBuffer = this._initArrayBuffer(this.lineValueArray, 1);

        this.dotPosBuffer = this._initArrayBuffer(this.dotPosArray, 2);
        this.dotSizeBuffer = this._initArrayBuffer(this.dotSizeArray, 1);
        this.dotColorBuffer = this._initArrayBuffer(this.dotColorArray, 4);
        this.dotTypeBuffer = this._initArrayBuffer(this.dotTypeArray, 1);
        this.dotValueBuffer = this._initArrayBuffer(this.dotValueArray, 1);

        this.rectStartBuffer = this._initArrayBuffer(this.rectStartArray, 2);
        this.rectEndBuffer = this._initArrayBuffer(this.rectEndArray, 2);
        this.rectColorBuffer = this._initArrayBuffer(this.rectColorArray, 4);
        this.rectValueBuffer = this._initArrayBuffer(this.rectValueArray, 1);
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
            this.GL.bindAttribLocation(program, this.LINE_VALUE_BUF, 'value');
        } else if (shape === 'dot') {
            this.GL.bindAttribLocation(program, this.DOT_VX_BUF, 'vertexPos');
            this.GL.bindAttribLocation(program, this.DOT_POS_BUF, 'inDotPos');
            this.GL.bindAttribLocation(program, this.DOT_SIZE_BUF, 'inDotSize');
            this.GL.bindAttribLocation(program, this.DOT_COLOR_BUF, 'dotColor');
            this.GL.bindAttribLocation(program, this.DOT_TYPE_BUF, 'dotType');
            this.GL.bindAttribLocation(program, this.DOT_VALUE_BUF, 'value');
        } else if (shape === 'rect') {
            this.GL.bindAttribLocation(program, this.RECT_VX_BUF, 'vertexPos');
            this.GL.bindAttribLocation(program, this.RECT_START_BUF, 'inRectStart');
            this.GL.bindAttribLocation(program, this.RECT_END_BUF, 'inRectEnd');
            this.GL.bindAttribLocation(program, this.RECT_COLOR_BUF, 'rectColor');
            this.GL.bindAttribLocation(program, this.RECT_VALUE_BUF, 'value');
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
        let gl = this.GL;
        let projection = new Float32Array([2 / this.canvas.width, 0, 0,
                                           0, -2 / this.canvas.height, 0,
                                          -1, 1, 1]);
        let resScaleX = 1;
        let resScaleY = 1;
        if (this.coordinateSystem == this.NDC) {
            resScaleX = this.canvas.width;
            resScaleY = this.canvas.height;
        }

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.lineProgram);
        let lineProjLoc = gl.getUniformLocation(this.lineProgram, 'projection');
        gl.uniformMatrix3fv(lineProjLoc, false, projection);

        let lineResLoc = gl.getUniformLocation(this.lineProgram, 'resolutionScale');
        gl.uniform2f(lineResLoc, resScaleX, resScaleY);

        let lineNoDataValueLocation = gl.getUniformLocation(this.lineProgram, "u_noDataValue");
        gl.uniform1f(lineNoDataValueLocation, this.noDataValue);

        let linelogScaleLocation = gl.getUniformLocation(this.lineProgram, "u_logscale");
        gl.uniform1f(linelogScaleLocation, this.logScale);

        let lineDomainLocation = gl.getUniformLocation(this.lineProgram, "u_domain");
        gl.uniform2fv(lineDomainLocation, this.domain);



        gl.useProgram(this.dotProgram);
        let dotProjLoc = gl.getUniformLocation(this.dotProgram, 'projection');
        gl.uniformMatrix3fv(dotProjLoc, false, projection);

        let dotResLoc = gl.getUniformLocation(this.dotProgram, 'resolutionScale');
        gl.uniform2f(dotResLoc, resScaleX, resScaleY);

        let dotNoDataValueLocation = gl.getUniformLocation(this.dotProgram, "u_noDataValue");
        gl.uniform1f(dotNoDataValueLocation, this.noDataValue);

        let dotlogScaleLocation = gl.getUniformLocation(this.dotProgram, "u_logscale");
        gl.uniform1f(dotlogScaleLocation, this.logScale);

        let dotDomainLocation = gl.getUniformLocation(this.dotProgram, "u_domain");
        gl.uniform2fv(dotDomainLocation, this.domain);



        gl.useProgram(this.rectProgram);
        let rectProjLoc = gl.getUniformLocation(this.rectProgram, 'projection');
        gl.uniformMatrix3fv(rectProjLoc, false, projection);

        let rectResLoc = gl.getUniformLocation(this.rectProgram, 'resolutionScale');
        gl.uniform2f(rectResLoc, resScaleX, resScaleY);

        let rectNoDataValueLocation = gl.getUniformLocation(this.rectProgram, "u_noDataValue");
        gl.uniform1f(rectNoDataValueLocation, this.noDataValue);

        let rectlogScaleLocation = gl.getUniformLocation(this.rectProgram, "u_logscale");
        gl.uniform1f(rectlogScaleLocation, this.logScale);

        let rectDomainLocation = gl.getUniformLocation(this.rectProgram, "u_domain");
        gl.uniform2fv(rectDomainLocation, this.domain);

    }

    destroy(){
        this.GL.getExtension('WEBGL_lose_context').loseContext(); 
        this.GL = undefined;
    }


    updateCanvasSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this._initUniforms();
    }

    getContext(){
        return this.GL;
    }



    addLine(startX, startY, endX, endY, width, colorR, colorG, colorB, colorA, value) {
        this.lineStartArray[2*this.numLines] = startX;
        this.lineStartArray[2*this.numLines+1] = startY;
        this.lineEndArray[2*this.numLines] = endX;
        this.lineEndArray[2*this.numLines+1] = endY;
        this.lineWidthArray[this.numLines] = width;
        this.lineColorArray[4*this.numLines] = colorR;
        this.lineColorArray[4*this.numLines+1] = colorG;
        this.lineColorArray[4*this.numLines+2] = colorB;
        this.lineColorArray[4*this.numLines+3] = colorA;
        this.lineValueArray[this.numLines] = value;
        this.numLines++;
    }


    addDot(posX, posY, size, type, colorR, colorG, colorB, colorA, value) {
        this.dotPosArray[2*this.numDots] = posX;
        this.dotPosArray[2*this.numDots+1] = posY;
        this.dotSizeArray[this.numDots] = size;
        this.dotColorArray[4*this.numDots] = colorR;
        this.dotColorArray[4*this.numDots+1] = colorG;
        this.dotColorArray[4*this.numDots+2] = colorB;
        this.dotColorArray[4*this.numDots+3] = colorA;
        this.dotTypeArray[this.numDots] = type;
        this.dotValueArray[this.numDots] = value;
        this.numDots++;
    }

    addRect(startX, startY, endX, endY, colorR, colorG, colorB, colorA, value) {
        this.rectStartArray[2*this.numRects] = startX;
        this.rectStartArray[2*this.numRects+1] = startY;
        this.rectEndArray[2*this.numRects] = endX;
        this.rectEndArray[2*this.numRects+1] = endY;
        this.rectColorArray[4*this.numRects] = colorR;
        this.rectColorArray[4*this.numRects+1] = colorG;
        this.rectColorArray[4*this.numRects+2] = colorB;
        this.rectColorArray[4*this.numRects+3] = colorA;
        this.rectValueArray[this.numRects] = value;
        this.numRects++;
    }

    drawImage(img) {
        this.GL.drawImage(img,this.canvas.width,this.canvas.height);
    }

    clear(){
        this.GL.clear(this.GL.COLOR_BUFFER_BIT);
    }

    clearRect(x,y,width, height){
        // turn on the scissor test.
        this.GL.enable(this.GL.SCISSOR_TEST);

        // set the scissor rectangle.
        this.GL.scissor(x, y, width, height);

        // clear.
        this.GL.clearColor(0, 0, 0, 0);
        this.GL.clear(this.GL.COLOR_BUFFER_BIT);

        // turn off the scissor test so you can render like normal again.
        this.GL.disable(this.GL.SCISSOR_TEST);
    }


    draw() {

        if (this.GLVersion == 2) {
            if (this.numRects > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateRectBuffers();
                this._drawRectsGL2();
            }
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
        } else if (this.GLVersion == 1) {
            if (this.numRects > 0) {
                // Update all line vertex buffers with added lines and dots:
                this._updateRectBuffers();
                this._drawRectsGL1();
            }
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
        }
        
        this.numLines = 0;
        this.numDots = 0;
        this.numRects = 0;

    }

    setColorScale(name) {
        if (!this.colorscales.hasOwnProperty(name)) {
            throw new Error("No such color scale '" + name + "'");
        }

        if (!this.colorScaleCanvas) {
            // Create single canvas to render colorscales
            this.colorScaleCanvas = document.createElement('canvas');
            this.colorScaleCanvas.width = 256;
            this.colorScaleCanvas.height = 1;  
        }
        this._renderColorScaleToCanvas(name, this.colorScaleCanvas);
        this.csName = name;
        this._setColorScaleImage(this.colorScaleCanvas);
    }

    setNoDataValue(noDataValue) {
        this.noDataValue = noDataValue;
    }

    setLogScale(logScale) {
        if(logScale) {
            this.logScale = 1.0;
        } else {
            this.logScale = 0.0;
        }
    }

    setDomain(domain) {
        this.domain = domain;
    }

    getColorScaleImage() {
        return this.colorScaleImage;
    }

    getColor(val) {
        const steps = this.colorScaleCanvas.width;
        const csImageData = this.colorScaleCanvas
            .getContext('2d')
            .getImageData(0, 0, steps, 1).data;
        const trange = this.domain[1] - this.domain[0];
        let c = Math.round(((val - this.domain[0]) / trange) * steps);
        let alpha = 255;
        if (c < 0) {
            c = 0;
            if (!this.clampLow) {
                alpha = 0;
            }
        }
        if (c > 255) {
            c = 255;
            if (!this.clampHigh) {
                alpha = 0;
            }
        }

        return [
            csImageData[c * 4],
            csImageData[(c * 4) + 1],
            csImageData[(c * 4) + 2],
            alpha,
        ];
    }

    addColorScale(id, colors, ranges){
        if(!this.colorscales.hasOwnProperty(id)){
            this.colorscales[id] = {
                colors: colors,
                positions: ranges
            };
        }
    }

    _renderColorScaleToCanvas(name, canvas) {

        var cs_def = this.colorscales[name];
        canvas.height = 1;
        var canvas_ctx = canvas.getContext("2d");

        if (Object.prototype.toString.call(cs_def) === "[object Object]") {
            canvas.width = 256;
            var gradient = canvas_ctx.createLinearGradient(0, 0, 256, 1);

            for (var i = 0; i < cs_def.colors.length; ++i) {
                gradient.addColorStop(cs_def.positions[i], cs_def.colors[i]);
            }
            canvas_ctx.fillStyle = gradient;
            canvas_ctx.fillRect(0, 0, 256, 1);
        }
        else if (Object.prototype.toString.call(cs_def) === "[object Uint8Array]") {
            canvas.width = 256;
            var imgData = canvas_ctx.createImageData(256, 1);
            imgData.data.set(cs_def);
            canvas_ctx.putImageData(imgData, 0, 0);
        } else {
            throw new Error("Color scale not defined.");
        }
    }


    _setColorScaleImage (colorScaleImage) {
        this.colorScaleImage = colorScaleImage;
        let gl = this.GL;
        if (this.textureScale) {
            gl.deleteTexture(this.textureScale);
        }
        this.textureScale = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textureScale);

        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // Upload the image into the texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, colorScaleImage);
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

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.lineValueBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.lineValueArray , 0, this.numLines);
    }


    _updateDotBuffers() {
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotPosBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotPosArray, 0, this.numDots * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotSizeBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotSizeArray, 0, this.numDots * 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotColorBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotColorArray, 0, this.numDots * 4);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotTypeBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotTypeArray, 0, this.numDots * 1);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.dotValueBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.dotValueArray, 0, this.numDots * 1);
    }

    _updateRectBuffers() {
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectStartBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectStartArray, 0, this.numRects * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectEndBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectEndArray , 0, this.numRects * 2);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectColorBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectColorArray, 0, this.numRects * 4);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.rectValueBuffer);
        this.GL.bufferSubData(this.GL.ARRAY_BUFFER, 0, this.rectValueArray, 0, this.numRects * 1);
    }


    _drawLinesGL2() {
        let gl = this.GL;
        // Use line drawing shaders:
        gl.useProgram(this.lineProgram);

        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.enableVertexAttribArray(this.LINE_VX_BUF);
        gl.enableVertexAttribArray(this.LINE_START_BUF);
        gl.enableVertexAttribArray(this.LINE_END_BUF);
        gl.enableVertexAttribArray(this.LINE_WIDTH_BUF);
        gl.enableVertexAttribArray(this.LINE_COLOR_BUF);
        gl.enableVertexAttribArray(this.LINE_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVertexBuffer);
        gl.vertexAttribPointer(this.LINE_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineStartBuffer);
        gl.vertexAttribPointer(this.LINE_START_BUF, 2, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(this.LINE_START_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineEndBuffer);
        gl.vertexAttribPointer(this.LINE_END_BUF, 2, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(this.LINE_END_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineWidthBuffer);
        gl.vertexAttribPointer(this.LINE_WIDTH_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.LINE_WIDTH_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColorBuffer);
        gl.vertexAttribPointer(this.LINE_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        gl.vertexAttribDivisor(this.LINE_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineValueBuffer);
        gl.vertexAttribPointer(this.LINE_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.LINE_VALUE_BUF, 1);

        // Draw all line instances:
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.numLines);
    }


    _drawDotsGL2() {
        let gl = this.GL;
        // Use dot drawing shaders:
        gl.useProgram(this.dotProgram);

        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.enableVertexAttribArray(this.DOT_VX_BUF);
        gl.enableVertexAttribArray(this.DOT_POS_BUF);
        gl.enableVertexAttribArray(this.DOT_SIZE_BUF);
        gl.enableVertexAttribArray(this.DOT_COLOR_BUF);
        gl.enableVertexAttribArray(this.DOT_TYPE_BUF);
        gl.enableVertexAttribArray(this.DOT_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotVertexBuffer);
        gl.vertexAttribPointer(this.DOT_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotPosBuffer);
        gl.vertexAttribPointer(this.DOT_POS_BUF, 2, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(this.DOT_POS_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotSizeBuffer);
        gl.vertexAttribPointer(this.DOT_SIZE_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.DOT_SIZE_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotColorBuffer);
        gl.vertexAttribPointer(this.DOT_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        gl.vertexAttribDivisor(this.DOT_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotTypeBuffer);
        gl.vertexAttribPointer(this.DOT_TYPE_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.DOT_TYPE_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotValueBuffer);
        gl.vertexAttribPointer(this.DOT_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.DOT_VALUE_BUF, 1);

        // Draw all dot instances:
        gl.drawArraysInstanced(gl.POINT, 0, 4, this.numDots);
    }

    _drawRectsGL2() {
        let gl = this.GL;
        // Use rect drawing shaders:
        gl.useProgram(this.rectProgram);

        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.enableVertexAttribArray(this.RECT_VX_BUF);
        gl.enableVertexAttribArray(this.RECT_START_BUF);
        gl.enableVertexAttribArray(this.RECT_END_BUF);
        gl.enableVertexAttribArray(this.RECT_COLOR_BUF);
        gl.enableVertexAttribArray(this.RECT_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectVertexBuffer);
        gl.vertexAttribPointer(this.RECT_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectStartBuffer);
        gl.vertexAttribPointer(this.RECT_START_BUF, 2, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(this.RECT_START_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectEndBuffer);
        gl.vertexAttribPointer(this.RECT_END_BUF, 2, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(this.RECT_END_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectColorBuffer);
        gl.vertexAttribPointer(this.RECT_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        gl.vertexAttribDivisor(this.RECT_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectValueBuffer);
        gl.vertexAttribPointer(this.RECT_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(this.RECT_VALUE_BUF, 1);

        // Draw all rect instances:
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.numRects);

    }


    _drawLinesGL1() {
        let gl = this.GL;
        // Use line drawing shaders:
        gl.useProgram(this.lineProgram);

        gl.enableVertexAttribArray(this.LINE_VX_BUF);
        gl.enableVertexAttribArray(this.LINE_START_BUF);
        gl.enableVertexAttribArray(this.LINE_END_BUF);
        gl.enableVertexAttribArray(this.LINE_WIDTH_BUF);
        gl.enableVertexAttribArray(this.LINE_COLOR_BUF);
        gl.enableVertexAttribArray(this.LINE_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVertexBuffer);
        gl.vertexAttribPointer(this.LINE_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineStartBuffer);
        gl.vertexAttribPointer(this.LINE_START_BUF, 2, gl.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_START_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineEndBuffer);
        gl.vertexAttribPointer(this.LINE_END_BUF, 2, gl.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_END_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineWidthBuffer);
        gl.vertexAttribPointer(this.LINE_WIDTH_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_WIDTH_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColorBuffer);
        gl.vertexAttribPointer(this.LINE_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineValueBuffer);
        gl.vertexAttribPointer(this.LINE_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.LINE_VALUE_BUF, 1);

        // Draw all line instances:
        this.ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, this.numLines);
    }


    _drawDotsGL1() {
        let gl = this.GL;
        // Use dot drawing shaders:
        gl.useProgram(this.dotProgram);

        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        gl.enableVertexAttribArray(this.DOT_VX_BUF);
        gl.enableVertexAttribArray(this.DOT_POS_BUF);
        gl.enableVertexAttribArray(this.DOT_SIZE_BUF);
        gl.enableVertexAttribArray(this.DOT_COLOR_BUF);
        gl.enableVertexAttribArray(this.DOT_TYPE_BUF);
        gl.enableVertexAttribArray(this.DOT_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotVertexBuffer);
        gl.vertexAttribPointer(this.DOT_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotPosBuffer);
        gl.vertexAttribPointer(this.DOT_POS_BUF, 2, gl.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_POS_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotSizeBuffer);
        gl.vertexAttribPointer(this.DOT_SIZE_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_SIZE_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotColorBuffer);
        gl.vertexAttribPointer(this.DOT_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotTypeBuffer);
        gl.vertexAttribPointer(this.DOT_TYPE_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_TYPE_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dotValueBuffer);
        gl.vertexAttribPointer(this.DOT_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.DOT_VALUE_BUF, 1);

        // Draw all dot instances:
        this.ext.drawArraysInstancedANGLE(gl.POINT, 0, 4, this.numDots);
    }

    _drawRectsGL1() {
        let gl = this.GL;
        // Use rect drawing shaders:
        gl.useProgram(this.rectProgram);

        gl.enableVertexAttribArray(this.RECT_VX_BUF);
        gl.enableVertexAttribArray(this.RECT_START_BUF);
        gl.enableVertexAttribArray(this.RECT_END_BUF);
        gl.enableVertexAttribArray(this.RECT_COLOR_BUF);
        gl.enableVertexAttribArray(this.RECT_VALUE_BUF);

        // Bind all line vertex buffers:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectVertexBuffer);
        gl.vertexAttribPointer(this.RECT_VX_BUF, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectStartBuffer);
        gl.vertexAttribPointer(this.RECT_START_BUF, 2, gl.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_START_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectEndBuffer);
        gl.vertexAttribPointer(this.RECT_END_BUF, 2, gl.FLOAT, false, 8, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_END_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectColorBuffer);
        gl.vertexAttribPointer(this.RECT_COLOR_BUF, 4, gl.FLOAT, false, 16, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_COLOR_BUF, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.rectValueBuffer);
        gl.vertexAttribPointer(this.RECT_VALUE_BUF, 1, gl.FLOAT, false, 4, 0);
        this.ext.vertexAttribDivisorANGLE(this.RECT_VALUE_BUF, 1);

        // Draw all rect instances:
        this.ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, this.numRects);
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

                precision mediump float;
                
                in vec4 color;
                in float dotType;
                in float dotSize;
                in float value;
                out vec4 fragmentColor;

                uniform sampler2D u_textureScale;
                uniform float u_noDataValue;
                uniform float u_logscale;
                uniform vec2 u_domain;

                void main(void) {

                    vec4 color_out = vec4(color.rgb  * color.a, color.a);

                    if(color.a < 0.0){
                        color_out = vec4(color.rgb, 1.0);
                    } else {
                        if(value != u_noDataValue){
                            float normalisedValue;
                            if(u_logscale == 1.0) {
                                normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                            } else {
                                normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                            }
                            vec4 text_col = texture(u_textureScale, vec2(normalisedValue, 0));
                            color_out = vec4(text_col.rgb  * color.a, color.a);
                        }
                    }

                    if(dotType == 0.0){ 

                        // Rectangle
                        fragmentColor = color_out;

                    } else if(dotType == 1.0){

                        // Empty Rectangle
                        vec2 m = gl_PointCoord.xy*dotSize;
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        if( (color.a > 0.0) && 
                            (m.x >= borderSize && m.x <= dotSize-borderSize) && 
                            (m.y >= borderSize && m.y <= dotSize-borderSize) ) {
                            discard;
                        }
                        
                        fragmentColor = color_out;

                    } else if(dotType == 2.0){

                        // Circle

                        float border = 0.05;
                        float radius = 0.5;
                        vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);

                        vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                        float dist = radius - sqrt(m.x * m.x + m.y * m.y);

                        float t = 0.0;
                        if (dist > border){
                            t = 1.0;
                        } else if (dist > 0.0){
                            t = dist / border;
                        }
                        // float centerDist = length(gl_PointCoord - 0.5);
                        // works for overlapping circles if blending is enabled
                        fragmentColor = mix(color0, color_out, t);

                    } else if(dotType == 3.0){

                        // Circle empty

                        float border = 0.05;
                        float radius = 0.5;
                        vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);

                        vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                        float dist = radius - sqrt(m.x * m.x + m.y * m.y);
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        float t = 0.0;
                        if((color.a >= 0.0) && dist*dotSize>=borderSize){
                            discard;
                        }else if (dist > border){
                            t = 1.0;
                        } else if (dist > 0.0){
                            t = dist / border;
                        }
                        // float centerDist = length(gl_PointCoord - 0.5);
                        // works for overlapping circles if blending is enabled
                        fragmentColor = mix(color0, color_out, t);

                    }else if(dotType == 4.0){

                        // + Symbol
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }
                        borderSize = borderSize/2.0;

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.5))*dotSize;
                        if(color.a > 0.0){
                            if( (m.x > borderSize || m.x < -borderSize) &&
                                (m.y > borderSize || m.y < -borderSize) ){
                                discard;
                            }
                        }

                        fragmentColor = color_out;

                    } else if(dotType == 5.0){

                        // x Symbol
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }
                        borderSize = borderSize/2.0;

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.5))*dotSize;
                        if( color.a > 0.0 && (abs(abs(m.x)-abs(m.y)) >= borderSize) ) {
                            discard;
                        }

                        fragmentColor = color_out;

                    } else if(dotType == 6.0){

                       // Triangle filled

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.0))*dotSize;
                        if( abs(m.x)*2.0 > m.y ) {
                            discard;
                        }
                        fragmentColor = color_out;

                    } else if(dotType == 7.0){

                        // Triangle empty
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.0))*dotSize;
                        if( abs(m.x)*2.0 > m.y ) {
                            discard;
                        }
                        if( (m.y < dotSize-(borderSize) ) && (abs(m.x)*2.0 < m.y-borderSize*2.0) &&
                             (color.a >= 0.0) ) {
                            discard;
                        }
                        fragmentColor = color_out;
                    }

                }`;

                dotVertexSource =
                    `#version 300 es
                    precision mediump float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inDotPos;
                    layout(location = 2) in float inDotSize;
                    layout(location = 3) in vec4 dotColor;
                    layout(location = 4) in float inDotType;
                    layout(location = 5) in float inValue;

                    out vec4 color;
                    out float dotSize;
                    out float dotType;
                    out float value;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = dotColor;
                        dotSize = inDotSize;
                        dotType = inDotType;
                        value = inValue;
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
                    precision mediump float;

                    in vec4 color;
                    in float value;
                    out vec4 fragmentColor;

                    uniform sampler2D u_textureScale;
                    uniform float u_noDataValue;
                    uniform float u_logscale;
                    uniform vec2 u_domain;

                    void main(void) {
                        vec4 color_out = vec4(color.rgb  * color.a, color.a);

                        if(value != u_noDataValue){
                            float normalisedValue;
                            if(u_logscale == 1.0) {
                                normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                            } else {
                                normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                            }
                            vec4 text_col = texture(u_textureScale, vec2(normalisedValue, 0));
                            color_out = vec4(text_col.rgb  * color.a, color.a);
                        }
                        fragmentColor = color_out;
                }`;
            
                lineVertexSource = 
                   `#version 300 es
                    precision mediump float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inLineStart;
                    layout(location = 2) in vec2 inLineEnd;
                    layout(location = 3) in float inLineWidth;
                    layout(location = 4) in vec4 lineColor;
                    layout(location = 5) in float inValue;

                    out vec4 color;
                    out float value;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = lineColor;
                        value = inValue;

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
                    precision mediump float;

                    in vec4 color;
                    in float value;
                    out vec4 fragmentColor;

                    uniform sampler2D u_textureScale;
                    uniform float u_noDataValue;
                    uniform float u_logscale;
                    uniform vec2 u_domain;

                    void main(void) {

                        vec4 color_out = vec4(color.rgb  * color.a, color.a);
                        if(color.a < 0.0){
                            color_out = vec4(color.rgb, 1.0);
                        } else {
                            if(value != u_noDataValue){
                                float normalisedValue;
                                if(u_logscale == 1.0) {
                                    normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                                } else {
                                    normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                                }
                                vec4 text_col = texture(u_textureScale, vec2(normalisedValue, 0));
                                color_out = vec4(text_col.rgb  * color.a, color.a);
                            }
                        }
                        fragmentColor = color_out;
                }`;
            
                rectVertexSource = 
                   `#version 300 es
                    #define M_PI 3.1415926535897932384626433832795
                    precision mediump float;
                    layout(location = 0) in vec3 vertexPos;
                    layout(location = 1) in vec2 inRectStart;
                    layout(location = 2) in vec2 inRectEnd;
                    layout(location = 3) in vec4 rectColor;
                    layout(location = 4) in float inValue;


                    out float value;
                    out vec4 color;

                    uniform mat3 projection;
                    uniform vec2 resolutionScale;

                    void main(void) {
                        color = rectColor;
                        value = inValue;

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

                #define PI 3.14159265359
                #define TWO_PI 6.28318530718

                precision mediump float;

                varying vec4 color;
                varying float dotType;
                varying float dotSize;
                varying float value;

                uniform sampler2D u_textureScale;
                uniform float u_noDataValue;
                uniform float u_logscale;
                uniform vec2 u_domain;
                
                void main(void) {

                    vec4 color_out = vec4(color.rgb  * color.a, color.a);

                    if(color.a < 0.0){
                        color_out = vec4(color.rgb, 1.0);
                    } else {
                        if(value != u_noDataValue){
                            float normalisedValue;
                            if(u_logscale == 1.0) {
                                normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                            } else {
                                normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                            }
                            vec4 text_col = texture2D(u_textureScale, vec2(normalisedValue, 0));
                            color_out = vec4(text_col.rgb  * color.a, color.a);
                        }
                    }

                    if(dotType == 0.0){ 

                        // Rectangle
                        gl_FragColor = color_out;

                    } else if(dotType == 1.0){

                        // Empty Rectangle
                        vec2 m = gl_PointCoord.xy*dotSize;
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        if( (color.a > 0.0) && 
                            (m.x >= borderSize && m.x <= dotSize-borderSize) && 
                            (m.y >= borderSize && m.y <= dotSize-borderSize) ) {
                            discard;
                        }
                        
                        gl_FragColor = color_out;

                    } else if(dotType == 2.0){

                        // Circle

                        float border = 0.05;
                        float radius = 0.5;
                        vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);

                        vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                        float dist = radius - sqrt(m.x * m.x + m.y * m.y);

                        float t = 0.0;
                        if (dist > border){
                            t = 1.0;
                        } else if (dist > 0.0){
                            t = dist / border;
                        }
                        // float centerDist = length(gl_PointCoord - 0.5);
                        // works for overlapping circles if blending is enabled
                        gl_FragColor = mix(color0, color_out, t);

                    } else if(dotType == 3.0){

                        // Circle empty

                        float border = 0.05;
                        float radius = 0.5;
                        vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
                        float dis = 0.0;

                        vec2 m = gl_PointCoord.xy - vec2(0.5, 0.5);
                        float dist = radius - sqrt(m.x * m.x + m.y * m.y);
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        float t = 0.0;
                        if((color.a >= 0.0) && dist*dotSize>=borderSize){
                            discard;
                        }else if (dist > border){
                            t = 1.0;
                        } else if (dist > 0.0){
                            t = dist / border;
                        }
                        // float centerDist = length(gl_PointCoord - 0.5);
                        // works for overlapping circles if blending is enabled
                        gl_FragColor = mix(color0, color_out, t);

                    }else if(dotType == 4.0){

                        // + Symbol
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }
                        borderSize = borderSize/2.0;

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.5))*dotSize;
                        // Only discard if not used for picking, i.e. non negative alpha
                        if(color.a > 0.0){
                            if( (m.x > borderSize || m.x < -borderSize) &&
                                (m.y > borderSize || m.y < -borderSize) ){
                                discard;
                            }
                        }
                        gl_FragColor = color_out;

                    } else if(dotType == 5.0){

                        // x Symbol
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }
                        borderSize = borderSize/2.0;

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.5))*dotSize;
                        if( color.a > 0.0 && (abs(abs(m.x)-abs(m.y)) >= borderSize) ) {
                            discard;
                        }

                        gl_FragColor = color_out;

                    } else if(dotType == 6.0){

                       // Triangle filled

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.0))*dotSize;
                        if( abs(m.x)*2.0 > m.y ) {
                            discard;
                        }
                        gl_FragColor = color_out;

                    } else if(dotType == 7.0){

                        // Triangle empty
                        float borderSize = 0.1 * dotSize;
                        if(borderSize<1.2){
                            borderSize = 1.2;
                        }

                        vec2 m = (gl_PointCoord.xy - vec2(0.5, 0.0))*dotSize;
                        if( abs(m.x)*2.0 > m.y ) {
                            discard;
                        }
                        if( (m.y < dotSize-(borderSize) ) && (abs(m.x)*2.0 < m.y-borderSize*2.0) &&
                             (color.a >= 0.0) ) {
                            discard;
                        }
                        gl_FragColor = color_out;
                    }



                }`;

            dotVertexSource = 
                `#version 100
                
                precision mediump float;

                attribute vec3 vertexPos;
                attribute vec2 inDotPos;
                attribute float inDotSize;
                attribute vec4 dotColor;
                attribute float inDotType;
                attribute float inValue;

                varying vec4 color;
                varying float dotSize;
                varying float dotType;
                varying float value;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = dotColor;
                    dotSize = inDotSize;
                    dotType = inDotType;
                    value = inValue;
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
                `#version 100
                precision mediump float;

                varying vec4 color;
                varying float value;

                uniform sampler2D u_textureScale;
                uniform float u_noDataValue;
                uniform float u_logscale;
                uniform vec2 u_domain;

                void main(void) {
                    vec4 color_out = vec4(color.rgb  * color.a, color.a);

                    if(value != u_noDataValue){
                        float normalisedValue;
                        if(u_logscale == 1.0) {
                            normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                        } else {
                            normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                        }
                        vec4 text_col = texture2D(u_textureScale, vec2(normalisedValue, 0));
                        color_out = vec4(text_col.rgb  * color.a, color.a);
                    }
                    gl_FragColor = color_out;
                }`;

            lineVertexSource = 
                `#version 100
                precision mediump float;

                attribute vec3 vertexPos;
                attribute vec2 inLineStart;
                attribute vec2 inLineEnd;
                attribute float inLineWidth;
                attribute vec4 lineColor;
                attribute float inValue;

                varying vec4 color;
                varying float value;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = lineColor;
                    value = inValue;
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
                `#version 100
                precision mediump float;
                varying vec4 color;
                varying float value;

                uniform sampler2D u_textureScale;
                uniform float u_noDataValue;
                uniform float u_logscale;
                uniform vec2 u_domain;

                void main(void) {

                    vec4 color_out = vec4(color.rgb  * color.a, color.a);

                    if(color.a < 0.0){
                        color_out = vec4(color.rgb, 1.0);
                    } else {
                        if(value != u_noDataValue){
                            float normalisedValue;
                            if(u_logscale == 1.0) {
                                normalisedValue = (log(value) - log(u_domain[0])) / (log(u_domain[1]) - log(u_domain[0]));
                            } else {
                                normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                            }
                            vec4 text_col = texture2D(u_textureScale, vec2(normalisedValue, 0));
                            color_out = vec4(text_col.rgb  * color.a, color.a);
                        }
                    }
                    gl_FragColor = color_out;
                }`;
                
            rectVertexSource = 
               `#version 100
                precision mediump float;

                attribute vec3 vertexPos;
                attribute vec2 inRectStart;
                attribute vec2 inRectEnd;
                attribute vec4 rectColor;
                attribute float inValue;

                varying vec4 color;
                varying float value;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = rectColor;
                    value = inValue;

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