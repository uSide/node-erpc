const { expect } = require("chai");
const sinon = require("sinon");

const RPC = require("../index.js");

describe("RPC", () => {
  beforeEach(() => {
    RPC.config = undefined;
  });

  describe("#configure", () => {
    it("sets global config variable", () => {
      expect(RPC.config).to.equal(undefined);

      RPC.configure("server", [
        {
          name: "server2",
          endpoint: "endpoint",
          secret: "secret"
        }
      ]);

      expect(RPC.config.name).to.equal("server");
      expect(RPC.config.network.length).to.equal(1);
    });
  });

  describe("#getNode", () => {
    beforeEach(() => {
      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "secret"
        }
      ]);
    });

    it("returns node info by node name", () => {
      expect(RPC.getNode("known_server").secret).to.equal("secret");
    });

    it("throws error if node not exists", () => {
      expect(() => {
        RPC.getNode("unknown_server");
      }).to.throw("UNKNOWN_CLIENT");
    });
  });

  describe("#encrypt", () => {
    it("encypts data object with secret", () => {
      let stub = sinon
        .stub(RPC, "generateIV")
        .returns(Buffer.from("16bytes init vec"));

      expect(
        RPC.encrypt("32bytes of secret encryption key", { my: "data" })
      ).to.equal("MTZieXRlcyBpbml0IHZlY0siRZE1Lvxos+4XgT45N24=");

      stub.restore();
    });
  });

  describe("#decrypt", () => {
    it("decrypts data object with secret", () => {
      expect(
        RPC.decrypt(
          "32bytes of secret encryption key",
          "MTZieXRlcyBpbml0IHZlY0siRZE1Lvxos+4XgT45N24="
        )
      ).to.deep.equal({ my: "data" });
    });

    it("fails if encoded data is invalid", () => {
      expect(() => {
        RPC.decrypt(
          "32bytes of secret encryption key",
          "1iEabSmf4CIFMoLZA6merxIHSuh38UppQog3099kbpM="
        );
      }).to.throw("INVALID_PAYLOAD");
    });
  });

  describe("#request", () => {
    it("constructs request", () => {
      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "32bytes of secret encryption key"
        }
      ]);

      let request = RPC.request("known_server", "method", { param: 1 });

      expect(request.client).to.equal("server");
      expect(request.method).to.equal("method");

      let payload = RPC.decrypt(
        "32bytes of secret encryption key",
        request.payload
      );

      expect(payload.param).to.equal(1);
    });
  });

  describe("#success", () => {
    it("constructs success response", () => {
      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "32bytes of secret encryption key"
        }
      ]);

      let response = RPC.success("known_server", { param: 1 });

      expect(response.payload).to.be.a("string");
    });
  });

  describe("#error", () => {
    it("constructs error response", () => {
      expect(RPC.error("ERROR")).to.deep.equal({ error: "ERROR" });
    });
  });

  describe("#decode", () => {
    let request;

    beforeEach(() => {
      RPC.configure("known_server", [
        {
          name: "server",
          endpoint: "endpoint",
          secret: "32bytes of secret encryption key"
        }
      ]);

      request = JSON.stringify(RPC.request("server", "method", { param: 1 }));

      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "32bytes of secret encryption key"
        }
      ]);
    });

    it("decodes client request", () => {
      let decoded = RPC.decode(request);
      expect(decoded.payload.param).to.equal(1);
    });
  });
});
