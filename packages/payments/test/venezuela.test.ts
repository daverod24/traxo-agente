import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AvilaPayGateway,
  BancrecerValidator,
  MisPidiGateway,
  VenezuelanPaymentOrchestrator,
} from "../src/venezuela.ts";

describe("pasarelas de pago y conciliación venezolanas", () => {
  describe("MisPidiGateway (Banco Sofitasa)", () => {
    const misPidi = new MisPidiGateway({
      apiKey: "test_key",
      secretKey: "wh_sec_456",
    });

    it("valida la firma HMAC de webhooks de MisPidi", () => {
      const payload = JSON.stringify({ event: "transaction.completed", id: "tx_123" });
      const validSig = createHmac("sha256", "wh_sec_456").update(payload).digest("hex");

      expect(misPidi.verifyWebhookSignature(payload, validSig)).toBe(true);
      expect(misPidi.verifyWebhookSignature(payload, "invalid_sig")).toBe(false);
    });

    it("interpreta payloads de webhook completados", () => {
      const payload = {
        id: "tx_mp_999",
        status: "COMPLETED",
        reference: "00123456",
        amount_bs: 4400.0,
        amount_usd: 5.0,
        payment_method: "PAGO_MOVIL",
        payer_name: "Cliente Sofitasa",
      };

      const res = misPidi.parseWebhook(payload);
      expect(res.verified).toBe(true);
      expect(res.reference).toBe("00123456");
      expect(res.amountVes).toBe(4400.0);
      expect(res.provider).toBe("mispidi");
    });
  });

  describe("AvilaPayGateway", () => {
    const avilaPay = new AvilaPayGateway({
      apiKey: "av_key_123",
      merchantId: "merch_davebeauty",
    });

    it("procesa transacciones aprobadas de AvilaPay", async () => {
      const res = await avilaPay.verifyTransaction("av_tx_777");
      expect(res.verified).toBe(true);
      expect(res.provider).toBe("avilapay");
      expect(res.reference).toBe("av_tx_777");
    });
  });

  describe("BancrecerValidator (API 0174 Pago Móvil)", () => {
    const bancrecer = new BancrecerValidator({
      accountNumber: "01740001000000000000",
      clientId: "J-50123456-7",
      apiKey: "banc_secret",
    });

    it("valida Pago Móvil interbancario con número de referencia y CI", async () => {
      const res = await bancrecer.verifyPagoMovil({
        reference: "987654",
        originPhone: "04121234567",
        originId: "V-20123456",
        amountBs: 4400.0,
      });

      expect(res.verified).toBe(true);
      expect(res.provider).toBe("bancrecer");
      expect(res.bank).toBe("0174 - Bancrecer");
      expect(res.reference).toBe("987654");
    });
  });

  describe("VenezuelanPaymentOrchestrator", () => {
    const orchestrator = new VenezuelanPaymentOrchestrator();

    it("orquesta validación a través de bancrecer", async () => {
      const res = await orchestrator.validatePayment("bancrecer", {
        reference: "555123",
        amountBs: 2640.0,
        amountUsd: 3.0,
        phone: "04149876543",
        idNumber: "V-18765432",
      });

      expect(res.verified).toBe(true);
      expect(res.provider).toBe("bancrecer");
      expect(res.bank).toBe("0174 - Bancrecer");
    });

    it("orquesta validación a través de mispidi", async () => {
      const res = await orchestrator.validatePayment("mispidi", {
        reference: "mp_ref_001",
        rawPayload: {
          id: "mp_ref_001",
          status: "COMPLETED",
          reference: "mp_ref_001",
          amount_bs: 880.0,
          amount_usd: 1.0,
        },
      });

      expect(res.verified).toBe(true);
      expect(res.provider).toBe("mispidi");
      expect(res.bank).toBe("Banco Sofitasa / MisPidi");
    });
  });
});
