const crypto = require("crypto");

class RPC {
  static get TTL() {
    return 1000;
  }

  static timestamp() {
    return +(Date.now() / 1000).toFixed();
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
    let cipher = crypto.createCipher("aes-256-cbc", secret);
    return `${cipher.update(
      JSON.stringify(payload),
      "utf8",
      "hex"
    )}${cipher.final("hex")}`;
  }

  static decrypt(secret, payload) {
    let data;

    try {
      let decipher = crypto.createDecipher("aes-256-cbc", secret);
      data = `${decipher.update(payload, "hex", "utf8")}${decipher.final(
        "utf8"
      )}`;
    } catch (e) {
      throw new Error("INVALID_SECRET");
    }

    try {
      return JSON.parse(data);
    } catch (e) {
      throw new Error("INVALID_PAYLOAD");
    }
  }

  static request(client, method, payload) {
    let node = this.getNode(client);

    return {
      client: this.config.name,
      method,
      payload: this.encrypt(
        node.secret,
        Object.assign(payload, {
          timestamp: this.timestamp()
        })
      )
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

    let delay = this.timestamp() - data.payload.timestamp;

    if (delay > this.TTL) {
      throw new Error("EXPIRED_REQUEST");
    }

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
