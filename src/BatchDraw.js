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

        this.colorscales = {
            "viridis": new Uint8Array([68,1,84,255,68,2,86,255,69,4,87,255,69,5,89,255,70,7,90,255,70,8,92,255,70,10,93,255,70,11,94,255,71,13,96,255,71,14,97,255,71,16,99,255,71,17,100,255,71,19,101,255,72,20,103,255,72,22,104,255,72,23,105,255,72,24,106,255,72,26,108,255,72,27,109,255,72,28,110,255,72,29,111,255,72,31,112,255,72,32,113,255,72,33,115,255,72,35,116,255,72,36,117,255,72,37,118,255,72,38,119,255,72,40,120,255,72,41,121,255,71,42,122,255,71,44,122,255,71,45,123,255,71,46,124,255,71,47,125,255,70,48,126,255,70,50,126,255,70,51,127,255,70,52,128,255,69,53,129,255,69,55,129,255,69,56,130,255,68,57,131,255,68,58,131,255,68,59,132,255,67,61,132,255,67,62,133,255,66,63,133,255,66,64,134,255,66,65,134,255,65,66,135,255,65,68,135,255,64,69,136,255,64,70,136,255,63,71,136,255,63,72,137,255,62,73,137,255,62,74,137,255,62,76,138,255,61,77,138,255,61,78,138,255,60,79,138,255,60,80,139,255,59,81,139,255,59,82,139,255,58,83,139,255,58,84,140,255,57,85,140,255,57,86,140,255,56,88,140,255,56,89,140,255,55,90,140,255,55,91,141,255,54,92,141,255,54,93,141,255,53,94,141,255,53,95,141,255,52,96,141,255,52,97,141,255,51,98,141,255,51,99,141,255,50,100,142,255,50,101,142,255,49,102,142,255,49,103,142,255,49,104,142,255,48,105,142,255,48,106,142,255,47,107,142,255,47,108,142,255,46,109,142,255,46,110,142,255,46,111,142,255,45,112,142,255,45,113,142,255,44,113,142,255,44,114,142,255,44,115,142,255,43,116,142,255,43,117,142,255,42,118,142,255,42,119,142,255,42,120,142,255,41,121,142,255,41,122,142,255,41,123,142,255,40,124,142,255,40,125,142,255,39,126,142,255,39,127,142,255,39,128,142,255,38,129,142,255,38,130,142,255,38,130,142,255,37,131,142,255,37,132,142,255,37,133,142,255,36,134,142,255,36,135,142,255,35,136,142,255,35,137,142,255,35,138,141,255,34,139,141,255,34,140,141,255,34,141,141,255,33,142,141,255,33,143,141,255,33,144,141,255,33,145,140,255,32,146,140,255,32,146,140,255,32,147,140,255,31,148,140,255,31,149,139,255,31,150,139,255,31,151,139,255,31,152,139,255,31,153,138,255,31,154,138,255,30,155,138,255,30,156,137,255,30,157,137,255,31,158,137,255,31,159,136,255,31,160,136,255,31,161,136,255,31,161,135,255,31,162,135,255,32,163,134,255,32,164,134,255,33,165,133,255,33,166,133,255,34,167,133,255,34,168,132,255,35,169,131,255,36,170,131,255,37,171,130,255,37,172,130,255,38,173,129,255,39,173,129,255,40,174,128,255,41,175,127,255,42,176,127,255,44,177,126,255,45,178,125,255,46,179,124,255,47,180,124,255,49,181,123,255,50,182,122,255,52,182,121,255,53,183,121,255,55,184,120,255,56,185,119,255,58,186,118,255,59,187,117,255,61,188,116,255,63,188,115,255,64,189,114,255,66,190,113,255,68,191,112,255,70,192,111,255,72,193,110,255,74,193,109,255,76,194,108,255,78,195,107,255,80,196,106,255,82,197,105,255,84,197,104,255,86,198,103,255,88,199,101,255,90,200,100,255,92,200,99,255,94,201,98,255,96,202,96,255,99,203,95,255,101,203,94,255,103,204,92,255,105,205,91,255,108,205,90,255,110,206,88,255,112,207,87,255,115,208,86,255,117,208,84,255,119,209,83,255,122,209,81,255,124,210,80,255,127,211,78,255,129,211,77,255,132,212,75,255,134,213,73,255,137,213,72,255,139,214,70,255,142,214,69,255,144,215,67,255,147,215,65,255,149,216,64,255,152,216,62,255,155,217,60,255,157,217,59,255,160,218,57,255,162,218,55,255,165,219,54,255,168,219,52,255,170,220,50,255,173,220,48,255,176,221,47,255,178,221,45,255,181,222,43,255,184,222,41,255,186,222,40,255,189,223,38,255,192,223,37,255,194,223,35,255,197,224,33,255,200,224,32,255,202,225,31,255,205,225,29,255,208,225,28,255,210,226,27,255,213,226,26,255,216,226,25,255,218,227,25,255,221,227,24,255,223,227,24,255,226,228,24,255,229,228,25,255,231,228,25,255,234,229,26,255,236,229,27,255,239,229,28,255,241,229,29,255,244,230,30,255,246,230,32,255,248,230,33,255,251,231,35,255,253,231,37,255]),
            "inferno": new Uint8Array([0,0,4,255,1,0,5,255,1,1,6,255,1,1,8,255,2,1,10,255,2,2,12,255,2,2,14,255,3,2,16,255,4,3,18,255,4,3,20,255,5,4,23,255,6,4,25,255,7,5,27,255,8,5,29,255,9,6,31,255,10,7,34,255,11,7,36,255,12,8,38,255,13,8,41,255,14,9,43,255,16,9,45,255,17,10,48,255,18,10,50,255,20,11,52,255,21,11,55,255,22,11,57,255,24,12,60,255,25,12,62,255,27,12,65,255,28,12,67,255,30,12,69,255,31,12,72,255,33,12,74,255,35,12,76,255,36,12,79,255,38,12,81,255,40,11,83,255,41,11,85,255,43,11,87,255,45,11,89,255,47,10,91,255,49,10,92,255,50,10,94,255,52,10,95,255,54,9,97,255,56,9,98,255,57,9,99,255,59,9,100,255,61,9,101,255,62,9,102,255,64,10,103,255,66,10,104,255,68,10,104,255,69,10,105,255,71,11,106,255,73,11,106,255,74,12,107,255,76,12,107,255,77,13,108,255,79,13,108,255,81,14,108,255,82,14,109,255,84,15,109,255,85,15,109,255,87,16,110,255,89,16,110,255,90,17,110,255,92,18,110,255,93,18,110,255,95,19,110,255,97,19,110,255,98,20,110,255,100,21,110,255,101,21,110,255,103,22,110,255,105,22,110,255,106,23,110,255,108,24,110,255,109,24,110,255,111,25,110,255,113,25,110,255,114,26,110,255,116,26,110,255,117,27,110,255,119,28,109,255,120,28,109,255,122,29,109,255,124,29,109,255,125,30,109,255,127,30,108,255,128,31,108,255,130,32,108,255,132,32,107,255,133,33,107,255,135,33,107,255,136,34,106,255,138,34,106,255,140,35,105,255,141,35,105,255,143,36,105,255,144,37,104,255,146,37,104,255,147,38,103,255,149,38,103,255,151,39,102,255,152,39,102,255,154,40,101,255,155,41,100,255,157,41,100,255,159,42,99,255,160,42,99,255,162,43,98,255,163,44,97,255,165,44,96,255,166,45,96,255,168,46,95,255,169,46,94,255,171,47,94,255,173,48,93,255,174,48,92,255,176,49,91,255,177,50,90,255,179,50,90,255,180,51,89,255,182,52,88,255,183,53,87,255,185,53,86,255,186,54,85,255,188,55,84,255,189,56,83,255,191,57,82,255,192,58,81,255,193,58,80,255,195,59,79,255,196,60,78,255,198,61,77,255,199,62,76,255,200,63,75,255,202,64,74,255,203,65,73,255,204,66,72,255,206,67,71,255,207,68,70,255,208,69,69,255,210,70,68,255,211,71,67,255,212,72,66,255,213,74,65,255,215,75,63,255,216,76,62,255,217,77,61,255,218,78,60,255,219,80,59,255,221,81,58,255,222,82,56,255,223,83,55,255,224,85,54,255,225,86,53,255,226,87,52,255,227,89,51,255,228,90,49,255,229,92,48,255,230,93,47,255,231,94,46,255,232,96,45,255,233,97,43,255,234,99,42,255,235,100,41,255,235,102,40,255,236,103,38,255,237,105,37,255,238,106,36,255,239,108,35,255,239,110,33,255,240,111,32,255,241,113,31,255,241,115,29,255,242,116,28,255,243,118,27,255,243,120,25,255,244,121,24,255,245,123,23,255,245,125,21,255,246,126,20,255,246,128,19,255,247,130,18,255,247,132,16,255,248,133,15,255,248,135,14,255,248,137,12,255,249,139,11,255,249,140,10,255,249,142,9,255,250,144,8,255,250,146,7,255,250,148,7,255,251,150,6,255,251,151,6,255,251,153,6,255,251,155,6,255,251,157,7,255,252,159,7,255,252,161,8,255,252,163,9,255,252,165,10,255,252,166,12,255,252,168,13,255,252,170,15,255,252,172,17,255,252,174,18,255,252,176,20,255,252,178,22,255,252,180,24,255,251,182,26,255,251,184,29,255,251,186,31,255,251,188,33,255,251,190,35,255,250,192,38,255,250,194,40,255,250,196,42,255,250,198,45,255,249,199,47,255,249,201,50,255,249,203,53,255,248,205,55,255,248,207,58,255,247,209,61,255,247,211,64,255,246,213,67,255,246,215,70,255,245,217,73,255,245,219,76,255,244,221,79,255,244,223,83,255,244,225,86,255,243,227,90,255,243,229,93,255,242,230,97,255,242,232,101,255,242,234,105,255,241,236,109,255,241,237,113,255,241,239,117,255,241,241,121,255,242,242,125,255,242,244,130,255,243,245,134,255,243,246,138,255,244,248,142,255,245,249,146,255,246,250,150,255,248,251,154,255,249,252,157,255,250,253,161,255,252,255,164,255]),
            "rainbow": {
              colors: ['#96005A', '#0000C8', '#0019FF', '#0098FF', '#2CFF96', '#97FF00', '#FFEA00', '#FF6F00', '#FF0000'],
              positions: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
            },
            "jet": {
              colors: ['#000083', '#003CAA', '#05FFFF', '#FFFF00', '#FA0000', '#800000'],
              positions: [0, 0.125, 0.375, 0.625, 0.875, 1]
            },
            "hsv": {
              colors: ["#ff0000","#fdff02","#f7ff02","#00fc04","#00fc0a","#01f9ff","#0200fd","#0800fd","#ff00fb","#ff00f5","#ff0006"],
              positions: [0,0.169,0.173,0.337,0.341,0.506,0.671,0.675,0.839,0.843,1]
            },
            "hot": {
              colors: ["#000000","#e60000","#ffd200","#ffffff"],
              positions: [0,0.3,0.6,1]
            },
            "cool": {
              colors: ["#00ffff","#ff00ff"],
              positions: [0,1]
            }
        }

        this.setNoDataValue(Number.NEGATIVE_INFINITY);
        this.setDomain([-5,5]);
        
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
        this.DOT_TYPE_BUF = 4;
        this.DOT_VALUE_BUF = 5;

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
        this.dotTypeArray = new Float32Array(this.maxDots);
        this.dotValueArray = new Float32Array(this.maxDots);

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
        this.dotTypeBuffer = this._initArrayBuffer(this.dotTypeArray, 1);
        this.dotValueBuffer = this._initArrayBuffer(this.dotValueArray, 1);

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
            this.GL.bindAttribLocation(program, this.DOT_TYPE_BUF, 'dotType');
            this.GL.bindAttribLocation(program, this.DOT_VALUE_BUF, 'value');
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

        let lineDomainLocation = gl.getUniformLocation(this.lineProgram, "u_domain");
        gl.uniform2fv(lineDomainLocation, this.domain);



        gl.useProgram(this.dotProgram);
        let dotProjLoc = gl.getUniformLocation(this.dotProgram, 'projection');
        gl.uniformMatrix3fv(dotProjLoc, false, projection);

        let dotResLoc = gl.getUniformLocation(this.dotProgram, 'resolutionScale');
        gl.uniform2f(dotResLoc, resScaleX, resScaleY);

        let dotNoDataValueLocation = gl.getUniformLocation(this.dotProgram, "u_noDataValue");
        gl.uniform1f(dotNoDataValueLocation, this.noDataValue);

        let dotDomainLocation = gl.getUniformLocation(this.dotProgram, "u_domain");
        gl.uniform2fv(dotDomainLocation, this.domain);



        gl.useProgram(this.rectProgram);
        let rectProjLoc = gl.getUniformLocation(this.rectProgram, 'projection');
        gl.uniformMatrix3fv(rectProjLoc, false, projection);

        let rectResLoc = gl.getUniformLocation(this.rectProgram, 'resolutionScale');
        gl.uniform2f(rectResLoc, resScaleX, resScaleY);

        let rectNoDataValueLocation = gl.getUniformLocation(this.rectProgram, "u_noDataValue");
        gl.uniform1f(rectNoDataValueLocation, this.noDataValue);

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
        this.name = name;
        this._setColorScaleImage(this.colorScaleCanvas);
    }

    setNoDataValue(noDataValue) {
        this.noDataValue = noDataValue;
    }

    setDomain(domain) {
        this.domain = domain;
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
                uniform vec2 u_domain;

                void main(void) {

                    vec4 color_out = vec4(color.rgb  * color.a, color.a);

                    if(value != u_noDataValue){
                        float normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
                        vec4 text_col = texture(u_textureScale, vec2(normalisedValue, 0));
                        color_out = vec4(text_col.rgb  * color.a, color.a);
                    }

                    if(color.a < 0.0){
                        color_out = vec4(color.rgb, 1.0);
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
                    out vec4 fragmentColor;
                    void main(void) {
                        fragmentColor = vec4(color.rgb  * color.a, color.a);;
                }`;
            
                lineVertexSource = 
                   `#version 300 es
                    precision mediump float;
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
                    precision mediump float;
                    in vec4 color;
                    out vec4 fragmentColor;
                    void main(void) {
                        fragmentColor = vec4(color.rgb * color.a, color.a);
                }`;
            
                rectVertexSource = 
                   `#version 300 es
                    #define M_PI 3.1415926535897932384626433832795
                    precision mediump float;
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

                #define PI 3.14159265359
                #define TWO_PI 6.28318530718

                precision mediump float;
                
                varying vec4 color;
                varying float dotType;
                varying float dotSize;
                
                void main(void) {

                    vec4 color_out = vec4(color.rgb * color.a, color.a);
                    if(color.a < 0.0){
                        color_out = vec4(color.rgb, 1.0);
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

                varying vec4 color;
                varying float dotSize;
                varying float dotType;

                uniform mat3 projection;
                uniform vec2 resolutionScale;

                void main(void) {
                    color = dotColor;
                    dotSize = inDotSize;
                    dotType = inDotType;
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

                void main(void) {
                    gl_FragColor = color;
                }`;

            lineVertexSource = 
                `#version 100
                precision mediump float;

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


            rectFragSource =
                `#version 100
                precision mediump float;
                varying vec4 color;

                void main(void) {
                    gl_FragColor = vec4(color.rgb * color.a, color.a);
                }`;
                
            rectVertexSource = 
               `#version 100
                precision mediump float;

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