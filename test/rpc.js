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
      expect(RPC.encrypt("secret", { my: "data" })).to.equal(
        "e2d23072ff61ee19b3f9c31a46b67cec"
      );
    });
  });

  describe("#decrypt", () => {
    it("decrypts data object with secret", () => {
      expect(
        RPC.decrypt("secret", "e2d23072ff61ee19b3f9c31a46b67cec")
      ).to.deep.equal({ my: "data" });
    });

    it("fails if encoded data is invalid", () => {
      expect(() => {
        RPC.decrypt("secret", "0779059bf545e980c0329201dbde4ea7");
      }).to.throw("INVALID_PAYLOAD");
    });
  });

  describe("#request", () => {
    it("constructs request", () => {
      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "secret"
        }
      ]);

      let request = RPC.request("known_server", "method", { param: 1 });

      expect(request.client).to.equal("server");
      expect(request.method).to.equal("method");

      let payload = RPC.decrypt("secret", request.payload);

      expect(payload.param).to.equal(1);
      expect(payload.timestamp).to.be.a("number");
    });
  });

  describe("#success", () => {
    it("constructs success response", () => {
      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "secret"
        }
      ]);

      let response = RPC.success("known_server", { param: 1 });

      expect();
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
          secret: "secret"
        }
      ]);

      request = JSON.stringify(RPC.request("server", "method", { param: 1 }));

      RPC.configure("server", [
        {
          name: "known_server",
          endpoint: "endpoint",
          secret: "secret"
        }
      ]);
    });

    it("decodes client request", () => {
      let decoded = RPC.decode(request);
      expect(decoded.payload.param).to.equal(1);
    });

    it("fails if request expired", () => {
      let stub = sinon.stub(RPC, "timestamp").returns(Date.now());

      expect(() => {
        RPC.decode(request);
      }).to.throw("EXPIRED_REQUEST");

      stub.restore();
    });
  });
});
