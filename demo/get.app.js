'use strict';

// For IE8 compatibility.

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (!Date.now) {
  Date.now = function () {
    return new Date().getTime();
  };
}

/**
 * AcquiaHttpHmac - Let's you sign a XMLHttpRequest object by Acquia's HTTP HMAC Spec.
 * For more information, see: https://github.com/acquia/http-hmac-spec/tree/2.0
 */

var AcquiaHttpHmac = function () {
  /**
   * Constructor.
   *
   * @constructor
   * @param {string} Realm
   *   The provider.
   * @param {string} public_key
   *   Public key.
   * @param {string} secret_key
   *   Secret key.
   * @param {string} version
   *   Authenticator version.
   * @param {string} default_content_type
   *   Default content type of all signings (other than specified during signing).
   */

  function AcquiaHttpHmac(_ref) {
    var realm = _ref.realm;
    var public_key = _ref.public_key;
    var secret_key = _ref.secret_key;
    var _ref$version = _ref.version;
    var version = _ref$version === undefined ? '2.0' : _ref$version;
    var _ref$default_content_ = _ref.default_content_type;
    var default_content_type = _ref$default_content_ === undefined ? 'application/json' : _ref$default_content_;

    _classCallCheck(this, AcquiaHttpHmac);

    if (!realm) {
      throw new Error('The "realm" must not be empty.');
    }
    if (!public_key) {
      throw new Error('The "public_key" must not be empty.');
    }
    if (!secret_key) {
      throw new Error('The "secret_key" must not be empty.');
    }

    var parsed_secret_key = CryptoJS.enc.Base64.parse(secret_key);
    this.config = { realm: realm, public_key: public_key, parsed_secret_key: parsed_secret_key, version: version, default_content_type: default_content_type };

    /**
     * Supported methods. Other HTTP methods through XMLHttpRequest are not supported by modern browsers due to insecurity.
     *
     * @type array
     */
    this.SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'CUSTOM'];
  }

  /**
   * Sign the request using provided parameters.
   *
   * @param {XMLHttpRequest} request
   *   The request to be signed.
   * @param {string} method
   *   Must be defined in the supported_methods.
   * @param {string} path
   *   End point's full URL path.
   * @param {object} signed_headers
   *   Signed headers.
   * @param {string} content_type
   *   Content type.
   * @param {string} body
   *   Body.
   * @returns {string}
   */

  _createClass(AcquiaHttpHmac, [{
    key: 'sign',
    value: function sign(_ref2) {
      var request = _ref2.request;
      var method = _ref2.method;
      var path = _ref2.path;
      var _ref2$signed_headers = _ref2.signed_headers;
      var signed_headers = _ref2$signed_headers === undefined ? {} : _ref2$signed_headers;
      var _ref2$content_type = _ref2.content_type;
      var content_type = _ref2$content_type === undefined ? this.config.default_content_type : _ref2$content_type;
      var _ref2$body = _ref2.body;
      var body = _ref2$body === undefined ? '' : _ref2$body;

      // Validate input. First 3 parameters are mandatory.
      if (!(request instanceof XMLHttpRequest)) {
        throw new Error('The request must be a XMLHttpRequest.');
      }
      if (this.SUPPORTED_METHODS.indexOf(method) < 0) {
        throw new Error('The method must be "' + this.SUPPORTED_METHODS.join('" or "') + '". "' + method + '" is not supported.');
      }
      if (!path) {
        throw new Error('The end point path must not be empty.');
      }

      /**
       * Convert an object of parameters to a string.
       *
       * @param {object} parameters
       *   Header parameters in key: value pair.
       * @param value_prefix
       *   The parameter value's prefix decoration.
       * @param value_suffix
       *   The parameter value's suffix decoration.
       * @param glue
       *   When join(), use this string as the glue.
       * @returns {string}
       */
      var parametersToString = function parametersToString(parameters) {
        var value_prefix = arguments.length <= 1 || arguments[1] === undefined ? '=' : arguments[1];
        var value_suffix = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];
        var glue = arguments.length <= 3 || arguments[3] === undefined ? '&' : arguments[3];

        var parameters_array = [];
        for (var parameter in parameters) {
          if (!parameters.hasOwnProperty(parameter)) {
            continue;
          }
          parameters_array.push('' + parameter + value_prefix + parameters[parameter] + value_suffix);
        }
        return parameters_array.join(glue);
      };

      /**
       * Generate a UUID nonce.
       *
       * @returns {string}
       */
      var generateNonce = function generateNonce() {
        var d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c == 'x' ? r : r & 0x7 | 0x8).toString(16);
        });
      };

      /**
       * Determine if this request sends body content (or skips silently).
       *
       * Note: modern browsers always skip body at send(), when the request method is "GET" or "HEAD".
       *
       * @param body
       *   Body content.
       * @param method
       *   The request's method.
       * @returns {boolean}
       */
      var willSendBody = function willSendBody(body, method) {
        var bodyless_request_types = ['GET', 'HEAD'];
        return body.length !== 0 && bodyless_request_types.indexOf(method) < 0;
      };

      // Compute the authorization headers.
      var nonce = generateNonce(),
          parser = document.createElement('a'),
          authorization_parameters = {
        id: this.config.public_key,
        nonce: nonce,
        realm: this.config.realm,
        version: this.config.version
      },
          x_authorization_timestamp = Math.floor(Date.now() / 1000).toString(),
          x_authorization_content_sha256 = willSendBody(body, method) ? CryptoJS.SHA256(body).toString(CryptoJS.enc.Base64) : '',
          signature_base_string_content_suffix = willSendBody(body, method) ? '\n' + content_type + '\n' + x_authorization_content_sha256 : '';

      parser.href = path;

      var site_port = parser.port ? ':' + parser.port : '',
          site_name_and_port = '' + parser.hostname + site_port,
          url_query_string = parser.search.substring(1),
          signature_base_string = method + '\n' + site_name_and_port + '\n' + parser.pathname + '\n' + url_query_string + '\n' + parametersToString(authorization_parameters) + '\n' + x_authorization_timestamp + signature_base_string_content_suffix,
          authorization_string = parametersToString(authorization_parameters, '="', '"', ','),
          authorization_signed_header_postfix = Object.keys(signed_headers).length === 0 ? '' : ',headers="' + Object.keys(signed_headers).join() + '"',
          signature = CryptoJS.HmacSHA256(signature_base_string, this.config.parsed_secret_key).toString(CryptoJS.enc.Base64),
          authorization = 'acquia-http-hmac ' + authorization_string + ',signature="' + signature + '"' + authorization_signed_header_postfix;

      // Set the authorizations headers.
      request.acquiaHttpHmac = {};
      request.acquiaHttpHmac.timestamp = x_authorization_timestamp;
      request.acquiaHttpHmac.nonce = nonce;
      request.setRequestHeader('X-Authorization-Timestamp', x_authorization_timestamp);
      request.setRequestHeader('Authorization', authorization);
      if (x_authorization_content_sha256) {
        request.setRequestHeader('X-Authorization-Content-SHA256', x_authorization_content_sha256);
      }
    }
  }, {
    key: 'hasValidResponse',

    /**
     * Check if the request has a valid response.
     *
     * @param {XMLHttpRequest} request
     *   The request to be validated.
     * @returns {boolean}
     *   TRUE if the request is valid; FALSE otherwise.
     */
    value: function hasValidResponse(request) {
      var signature_base_string = request.acquiaHttpHmac.nonce + '\n' + request.acquiaHttpHmac.timestamp + '\n' + request.responseText,
          signature = CryptoJS.HmacSHA256(signature_base_string, this.config.parsed_secret_key).toString(CryptoJS.enc.Base64),
          server_signature = request.getResponseHeader('X-Server-Authorization-HMAC-SHA256');

      return signature === server_signature;
    }
  }]);

  return AcquiaHttpHmac;
}();

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/

var CryptoJS = CryptoJS || function (h, s) {
  var f = {},
      g = f.lib = {},
      q = function q() {},
      m = g.Base = { extend: function extend(a) {
      q.prototype = this;var c = new q();a && c.mixIn(a);c.hasOwnProperty("init") || (c.init = function () {
        c.$super.init.apply(this, arguments);
      });c.init.prototype = c;c.$super = this;return c;
    }, create: function create() {
      var a = this.extend();a.init.apply(a, arguments);return a;
    }, init: function init() {}, mixIn: function mixIn(a) {
      for (var c in a) {
        a.hasOwnProperty(c) && (this[c] = a[c]);
      }a.hasOwnProperty("toString") && (this.toString = a.toString);
    }, clone: function clone() {
      return this.init.prototype.extend(this);
    } },
      r = g.WordArray = m.extend({ init: function init(a, c) {
      a = this.words = a || [];this.sigBytes = c != s ? c : 4 * a.length;
    }, toString: function toString(a) {
      return (a || k).stringify(this);
    }, concat: function concat(a) {
      var c = this.words,
          d = a.words,
          b = this.sigBytes;a = a.sigBytes;this.clamp();if (b % 4) for (var e = 0; e < a; e++) {
        c[b + e >>> 2] |= (d[e >>> 2] >>> 24 - 8 * (e % 4) & 255) << 24 - 8 * ((b + e) % 4);
      } else if (65535 < d.length) for (e = 0; e < a; e += 4) {
        c[b + e >>> 2] = d[e >>> 2];
      } else c.push.apply(c, d);this.sigBytes += a;return this;
    }, clamp: function clamp() {
      var a = this.words,
          c = this.sigBytes;a[c >>> 2] &= 4294967295 << 32 - 8 * (c % 4);a.length = h.ceil(c / 4);
    }, clone: function clone() {
      var a = m.clone.call(this);a.words = this.words.slice(0);return a;
    }, random: function random(a) {
      for (var c = [], d = 0; d < a; d += 4) {
        c.push(4294967296 * h.random() | 0);
      }return new r.init(c, a);
    } }),
      l = f.enc = {},
      k = l.Hex = { stringify: function stringify(a) {
      var c = a.words;a = a.sigBytes;for (var d = [], b = 0; b < a; b++) {
        var e = c[b >>> 2] >>> 24 - 8 * (b % 4) & 255;d.push((e >>> 4).toString(16));d.push((e & 15).toString(16));
      }return d.join("");
    }, parse: function parse(a) {
      for (var c = a.length, d = [], b = 0; b < c; b += 2) {
        d[b >>> 3] |= parseInt(a.substr(b, 2), 16) << 24 - 4 * (b % 8);
      }return new r.init(d, c / 2);
    } },
      n = l.Latin1 = { stringify: function stringify(a) {
      var c = a.words;a = a.sigBytes;for (var d = [], b = 0; b < a; b++) {
        d.push(String.fromCharCode(c[b >>> 2] >>> 24 - 8 * (b % 4) & 255));
      }return d.join("");
    }, parse: function parse(a) {
      for (var c = a.length, d = [], b = 0; b < c; b++) {
        d[b >>> 2] |= (a.charCodeAt(b) & 255) << 24 - 8 * (b % 4);
      }return new r.init(d, c);
    } },
      j = l.Utf8 = { stringify: function stringify(a) {
      try {
        return decodeURIComponent(escape(n.stringify(a)));
      } catch (c) {
        throw Error("Malformed UTF-8 data");
      }
    }, parse: function parse(a) {
      return n.parse(unescape(encodeURIComponent(a)));
    } },
      u = g.BufferedBlockAlgorithm = m.extend({ reset: function reset() {
      this._data = new r.init();this._nDataBytes = 0;
    }, _append: function _append(a) {
      "string" == typeof a && (a = j.parse(a));this._data.concat(a);this._nDataBytes += a.sigBytes;
    }, _process: function _process(a) {
      var c = this._data,
          d = c.words,
          b = c.sigBytes,
          e = this.blockSize,
          f = b / (4 * e),
          f = a ? h.ceil(f) : h.max((f | 0) - this._minBufferSize, 0);a = f * e;b = h.min(4 * a, b);if (a) {
        for (var g = 0; g < a; g += e) {
          this._doProcessBlock(d, g);
        }g = d.splice(0, a);c.sigBytes -= b;
      }return new r.init(g, b);
    }, clone: function clone() {
      var a = m.clone.call(this);
      a._data = this._data.clone();return a;
    }, _minBufferSize: 0 });g.Hasher = u.extend({ cfg: m.extend(), init: function init(a) {
      this.cfg = this.cfg.extend(a);this.reset();
    }, reset: function reset() {
      u.reset.call(this);this._doReset();
    }, update: function update(a) {
      this._append(a);this._process();return this;
    }, finalize: function finalize(a) {
      a && this._append(a);return this._doFinalize();
    }, blockSize: 16, _createHelper: function _createHelper(a) {
      return function (c, d) {
        return new a.init(d).finalize(c);
      };
    }, _createHmacHelper: function _createHmacHelper(a) {
      return function (c, d) {
        return new t.HMAC.init(a, d).finalize(c);
      };
    } });var t = f.algo = {};return f;
}(Math);
(function (h) {
  for (var s = CryptoJS, f = s.lib, g = f.WordArray, q = f.Hasher, f = s.algo, m = [], r = [], l = function l(a) {
    return 4294967296 * (a - (a | 0)) | 0;
  }, k = 2, n = 0; 64 > n;) {
    var j;a: {
      j = k;for (var u = h.sqrt(j), t = 2; t <= u; t++) {
        if (!(j % t)) {
          j = !1;break a;
        }
      }j = !0;
    }j && (8 > n && (m[n] = l(h.pow(k, 0.5))), r[n] = l(h.pow(k, 1 / 3)), n++);k++;
  }var a = [],
      f = f.SHA256 = q.extend({ _doReset: function _doReset() {
      this._hash = new g.init(m.slice(0));
    }, _doProcessBlock: function _doProcessBlock(c, d) {
      for (var b = this._hash.words, e = b[0], f = b[1], g = b[2], j = b[3], h = b[4], m = b[5], n = b[6], q = b[7], p = 0; 64 > p; p++) {
        if (16 > p) a[p] = c[d + p] | 0;else {
          var k = a[p - 15],
              l = a[p - 2];a[p] = ((k << 25 | k >>> 7) ^ (k << 14 | k >>> 18) ^ k >>> 3) + a[p - 7] + ((l << 15 | l >>> 17) ^ (l << 13 | l >>> 19) ^ l >>> 10) + a[p - 16];
        }k = q + ((h << 26 | h >>> 6) ^ (h << 21 | h >>> 11) ^ (h << 7 | h >>> 25)) + (h & m ^ ~h & n) + r[p] + a[p];l = ((e << 30 | e >>> 2) ^ (e << 19 | e >>> 13) ^ (e << 10 | e >>> 22)) + (e & f ^ e & g ^ f & g);q = n;n = m;m = h;h = j + k | 0;j = g;g = f;f = e;e = k + l | 0;
      }b[0] = b[0] + e | 0;b[1] = b[1] + f | 0;b[2] = b[2] + g | 0;b[3] = b[3] + j | 0;b[4] = b[4] + h | 0;b[5] = b[5] + m | 0;b[6] = b[6] + n | 0;b[7] = b[7] + q | 0;
    }, _doFinalize: function _doFinalize() {
      var a = this._data,
          d = a.words,
          b = 8 * this._nDataBytes,
          e = 8 * a.sigBytes;
      d[e >>> 5] |= 128 << 24 - e % 32;d[(e + 64 >>> 9 << 4) + 14] = h.floor(b / 4294967296);d[(e + 64 >>> 9 << 4) + 15] = b;a.sigBytes = 4 * d.length;this._process();return this._hash;
    }, clone: function clone() {
      var a = q.clone.call(this);a._hash = this._hash.clone();return a;
    } });s.SHA256 = q._createHelper(f);s.HmacSHA256 = q._createHmacHelper(f);
})(Math);
(function () {
  var h = CryptoJS,
      s = h.enc.Utf8;h.algo.HMAC = h.lib.Base.extend({ init: function init(f, g) {
      f = this._hasher = new f.init();"string" == typeof g && (g = s.parse(g));var h = f.blockSize,
          m = 4 * h;g.sigBytes > m && (g = f.finalize(g));g.clamp();for (var r = this._oKey = g.clone(), l = this._iKey = g.clone(), k = r.words, n = l.words, j = 0; j < h; j++) {
        k[j] ^= 1549556828, n[j] ^= 909522486;
      }r.sigBytes = l.sigBytes = m;this.reset();
    }, reset: function reset() {
      var f = this._hasher;f.reset();f.update(this._iKey);
    }, update: function update(f) {
      this._hasher.update(f);return this;
    }, finalize: function finalize(f) {
      var g = this._hasher;f = g.finalize(f);g.reset();return g.finalize(this._oKey.clone().concat(f));
    } });
})();

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
  var h = CryptoJS,
      j = h.lib.WordArray;h.enc.Base64 = { stringify: function stringify(b) {
      var e = b.words,
          f = b.sigBytes,
          c = this._map;b.clamp();b = [];for (var a = 0; a < f; a += 3) {
        for (var d = (e[a >>> 2] >>> 24 - 8 * (a % 4) & 255) << 16 | (e[a + 1 >>> 2] >>> 24 - 8 * ((a + 1) % 4) & 255) << 8 | e[a + 2 >>> 2] >>> 24 - 8 * ((a + 2) % 4) & 255, g = 0; 4 > g && a + 0.75 * g < f; g++) {
          b.push(c.charAt(d >>> 6 * (3 - g) & 63));
        }
      }if (e = c.charAt(64)) for (; b.length % 4;) {
        b.push(e);
      }return b.join("");
    }, parse: function parse(b) {
      var e = b.length,
          f = this._map,
          c = f.charAt(64);c && (c = b.indexOf(c), -1 != c && (e = c));for (var c = [], a = 0, d = 0; d < e; d++) {
        if (d % 4) {
          var g = f.indexOf(b.charAt(d - 1)) << 2 * (d % 4),
              h = f.indexOf(b.charAt(d)) >>> 6 - 2 * (d % 4);c[a >>> 2] |= (g | h) << 24 - 8 * (a % 4);a++;
        }
      }return j.create(c, a);
    }, _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" };
})();

/**
 * @file get.js
 */

// Configure your local script.
var method = 'GET'; // Can also be other methods here such as 'HEAD'.
var path = 'http://localhost:9000/http-hmac-javascript/demo/get.php?first_word=Hello&second_word=World#myAnchor';
var signed_headers = {
  'special-header-1': 'special_header_1_value',
  'special-header-2': 'special_header_2_value'
};
var content_type = 'text/plain';

// Create HMAC instance.
var hmac_config = {
  realm: 'dice',
  public_key: 'ABCD-1234',
  secret_key: 'd175024aa4c4d8b312a7114687790c772dd94fb725cb68016aaeae5a76d68102'
};
var HMAC = new AcquiaHttpHmac(hmac_config);

// Create and configure the request.
var request = new XMLHttpRequest();
// Define the state change action.
request.onreadystatechange = function () {
  if (request.readyState == 4) {
    // Check if the response status is 200 ok.
    if (request.status !== 200) {
      throw new Error('Problem retrieving data.', request);
      return;
    }

    // Validate the request's response.
    if (!HMAC.hasValidResponse(request)) {
      throw new Error('The request does not have a valid response.', request);
      return;
    }

    // Finally, carry out the intended change.
    document.getElementById('text-display').innerHTML = request.response;
  }
};
request.open(method, path, true);
request.setRequestHeader('Content-Type', content_type);

// The first two headers are the signed headers.
request.setRequestHeader('Special-Header-1', 'special_header_1_value');
request.setRequestHeader('Special-Header-2', 'special_header_2_value');
request.setRequestHeader('Special-Header-3', 'special_header_3_value');

// Sign the request using AcquiaHttpHmac.sign().
var sign_parameters = { request: request, method: method, path: path, signed_headers: signed_headers, content_type: content_type };
HMAC.sign(sign_parameters);

// Send the request.
request.send();