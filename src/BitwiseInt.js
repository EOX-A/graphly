
/** The BitwiseInt class
* implementing safe bitwise operations on 53-bit unsigned integers
* (Number.MAX_SAFE_INTEGER)
*
* @memberof module:graphly
*/

class BitwiseInt {

    /*
    static MAX_BIT_SIZE = 53;
    static LOW_BIT_SIZE = 31;
    static LOW_SIZE = 0x80000000;
    static LOW_MASK = 0x7fffffff;
    static HIGH_SIZE = 0x00400000;
    static HIGH_MASK = 0x003fffff;
    */

    /**
    * Create instance of BitwiseInt from a number
    * @param {Number} value - positive integer <= Number.MAX_SAFE_INTEGER
    */
    static fromNumber(value) {
        var lowPart = value % BitwiseInt.LOW_SIZE;
        var highPart = (value - lowPart) / BitwiseInt.LOW_SIZE;
        return new BitwiseInt(lowPart, highPart);
    }

    /**
    * Create instance of BitwiseInt from an Array or Booleans
    * @param {Array} boolArray - Array of Boolean flags (max.lenght 53,
    *        elements above this size are ignored)
    */
    static fromBoolArray(boolArray) {
        var i, max_i;
        var size = Math.min(BitwiseInt.MAX_BIT_SIZE, boolArray.length);
        var offset = BitwiseInt.LOW_BIT_SIZE;
        var lowPart = 0;
        for (i = 0, max_i = Math.min(offset, size)  ; i < max_i ; i++ ) {
            lowPart |= boolArray[i] << i
        }
        var highPart = 0;
        for (i = offset, max_i = size; i < max_i ; i++ ) {
            highPart |= boolArray[i] << (i - offset);
        }
        return new BitwiseInt(lowPart, highPart);
    }

    /**
    * Create instance of BitwiseInt
    * @constructor
    * @param {Number} lowPart - low-part of the BitwiseInt (bits 0 to 30)
    * @param {Number} highPart - high-part of the BitwiseInt (bits 31 to 52)
    */
    constructor(lowPart, highPart) {
        this.highPart = highPart & BitwiseInt.HIGH_MASK;
        this.lowPart = lowPart & BitwiseInt.LOW_MASK;
    }

    /**
    * Convert BitwiseInt to a Number
    */
    toNumber() {
        return (this.lowPart + this.highPart * BitwiseInt.LOW_SIZE);
    }

    /**
    * Convert BitwiseInt to an Array of Boolean values
    */
    toBoolArray(size) {
        var i, max_i;
        size = (
            size == null
            ? BitwiseInt.MAX_BIT_SIZE
            : Math.max(0, Math.min(BitwiseInt.MAX_BIT_SIZE, size))
        );
        var offset = BitwiseInt.LOW_BIT_SIZE;
        var boolArray = [];
        for (i = 0, max_i = Math.min(offset, size)  ; i < max_i ; i++ ) {
            boolArray[i] = Boolean(1 << i & this.lowPart);
        }
        for (i = offset, max_i = size; i < max_i ; i++ ) {
            boolArray[i] = Boolean(1 << (i - offset) & this.highPart);
        }
        return boolArray;
    }

    /**
    * equality comparison
    * @param {BitwiseInt} that
    */
    equals(that) {
        return this.lowPart === that.lowPart && this.highPart === that.highPart;
    }

    /**
    * bitwise NOT
    */
    not() {
        return new BitwiseInt(~this.lowPart, ~this.highPart);
    }

    /**
    * bitwise AND
    * @param {BitwiseInt} that
    */
    and(that) {
        return new BitwiseInt(
            this.lowPart & that.lowPart,
            this.highPart & that.highPart
        );
    }

    /**
    * bitwise OR
    * @param {BitwiseInt} that
    */
    or(that) {
        return new BitwiseInt(
            this.lowPart | that.lowPart,
            this.highPart | that.highPart
        );
    }

    /**
    * bitwise XOR
    * @param {BitwiseInt} that
    */
    xor(that) {
        return new BitwiseInt(
            this.lowPart ^ that.lowPart,
            this.highPart ^ that.highPart
        );
    }

    /**
    * bitwise left shift
    * @param {Number} bits
    */
    shiftLeft(bits) {
        if (bits === 0) {
            return new BitwiseInt(this.lowPart, this.highPart);
        }
        if (bits < 0) {
            return this.shiftRight(-bits);
        }
        var offset = BitwiseInt.LOW_BIT_SIZE;
        if (bits >= offset) {
            return new BitwiseInt(0, this.lowPart << (bits - offset));
        }
        return new BitwiseInt(
            this.lowPart << bits,
            this.highPart << bits | this.lowPart >> (offset - bits)
        );
    }

    /**
    * bitwise right shift
    * @param {Number} bits
    */
    shiftRight(bits) {
        if (bits === 0) {
            return new BitwiseInt(this.lowPart, this.highPart);
        }
        if (bits < 0) {
            return this.shiftLeft(-bits);
        }
        var offset = BitwiseInt.LOW_BIT_SIZE;
        if (bits >= offset) {
            return new BitwiseInt(this.highPart >> (bits - offset), 0);
        }
        return new BitwiseInt(
            this.lowPart >> bits | this.highPart << (offset - bits),
            this.highPart >> bits
        );
    }

    /**
     * get bit value as a Boolean
     *
     * @parmam {Number} bitIndex
     */
    getBit(bitIndex) {
      if (bitIndex < 0 || bitIndex >= BitwiseInt.MAX_BIT_SIZE) {
        return false;
      }
      var offset = BitwiseInt.LOW_BIT_SIZE;
      if (bitIndex >= offset) {
        return (this.highPart & (1 << (bitIndex - offset))) !== 0;
      }
      return (this.lowPart & (1 << bitIndex)) !== 0;
    }

    /**
     * set new BitwiseInt with bit value set from a Boolean
     *
     * @parmam {Number} bitIndex
     * @parmam {Boolean} value
     */
    setBit(bitIndex, value) {
      if (bitIndex < 0 || bitIndex >= BitwiseInt.MAX_BIT_SIZE) {
        return this;
      }
      var offset = BitwiseInt.LOW_BIT_SIZE;
      var lowPart = this.lowPart;
      var highPart = this.highPart;
      if (bitIndex >= offset) {
        highPart = _setBit(highPart, bitIndex - offset, value);
      } else {
        lowPart = _setBit(lowPart, bitIndex, value);
      }
      return new BitwiseInt(lowPart, highPart);
    }
}

var _setBit = function (source, bitIndex, bitValue) {
  var mask = 1 << bitIndex;
  return bitValue ? source | mask : source & ~mask;
}

/* static attributes and methods */
BitwiseInt.MAX_BIT_SIZE = 53;
BitwiseInt.LOW_BIT_SIZE = 31;
BitwiseInt.LOW_MASK = 0x7fffffff;
BitwiseInt.LOW_SIZE = 0x80000000;
BitwiseInt.HIGH_MASK = 0x003fffff;
BitwiseInt.HIGH_SIZE = 0x00400000;

/* useful constants */
BitwiseInt.ZERO = BitwiseInt.fromNumber(0);
BitwiseInt.ONE = BitwiseInt.fromNumber(1);


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = BitwiseInt;
else
    window.BitwiseInt = BitwiseInt;
