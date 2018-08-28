const crypto = require("crypto");

class RPC {
  static generateIV() {
    return crypto.randomBytes(16);
  }

  static configure(name, network) {
    this.config = {
      name,
      network
    };
  }

  static getNode(name) {
    for (let node of this.config.network) {
      if (node.name == name) {
        return node;
      }
    }

    throw new Error("UNKNOWN_CLIENT");
  }

  static encrypt(secret, payload) {
    let key = Buffer.from(secret, "binary");
    let iv = this.generateIV();

    if (key.length != 32) {
      throw new Error("INVALID_SECRET_LENGTH");
    }

    let cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(JSON.stringify(payload));
    let final = cipher.final();

    let result = Buffer.concat(
      [iv, encrypted, final],
      iv.length + encrypted.length + final.length
    );

    return result.toString("base64");
  }

  static decrypt(secret, payload) {
    let key = Buffer.from(secret, "binary");
    let encrypted = Buffer.from(payload, "base64");
    let iv = encrypted.slice(0, 16);
    let message = encrypted.slice(16);

    if (key.length != 32) {
      throw new Error("INVALID_SECRET_LENGTH");
    }

    let decoded;

    try {
      let decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      decoded = decipher.update(message) + decipher.final();
    } catch (e) {
      throw new Error("INVALID_SECRET");
    }

    try {
      return JSON.parse(decoded);
    } catch (e) {
      throw new Error("INVALID_PAYLOAD");
    }
  }

  static request(client, method, payload) {
    let node = this.getNode(client);
    payload.timestamp = (Date.now() / 1000).toFixed(0);

    return {
      client: this.config.name,
      method,
      payload: this.encrypt(node.secret, payload)
    };
  }

  static decode(body) {
    let data;

    try {
      data = JSON.parse(body);
    } catch (e) {
      throw new Error("BAD_REQUEST");
    }

    let node = this.getNode(data.client);
    data.payload = this.decrypt(node.secret, data.payload);

    return data;
  }

  static success(client, payload) {
    let node = this.getNode(client);
    return {
      payload: this.encrypt(node.secret, payload)
    };
  }

  static error(code) {
    return {
      error: code
    };
  }
}

module.exports = RPC;
