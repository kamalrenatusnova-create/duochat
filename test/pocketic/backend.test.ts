// Backend lane: drives the real canister installed from the built wasm against
// the platform's PocketIC sidecar. This is the only place the app's Motoko
// behavior is exercised for real; the frontend suite mocks the actor entirely.
//
// The runner (run-backend-lane.mjs) supplies POCKET_IC_URL and BACKEND_WASM and
// declines the lane when either is absent, so this file can assume both exist.

import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor } from "@dfinity/pic";
import { Principal } from "@icp-sdk/core/principal";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did.d.ts";

const POCKET_IC_URL = process.env.POCKET_IC_URL;
const BACKEND_WASM = process.env.BACKEND_WASM;

if (POCKET_IC_URL === undefined || BACKEND_WASM === undefined) {
  throw new Error(
    "backend lane requires POCKET_IC_URL and BACKEND_WASM; run it through test/pocketic/run-backend-lane.mjs",
  );
}

type BackendActor = Actor<_SERVICE>;

let pic: PocketIc;
let canisterId: Principal;

/** A fresh actor whose sender is the given seed's principal. */
function actorFor(seed: string): BackendActor {
  const actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
  actor.setIdentity(createIdentity(seed));
  return actor;
}

/** The principal a seed maps to, for asserting participants/senders. */
function principalFor(seed: string): Principal {
  return createIdentity(seed).getPrincipal();
}

beforeAll(async () => {
  pic = await PocketIc.create(POCKET_IC_URL, { processingTimeoutMs: 30_000 });
  canisterId = await pic.createCanister();
  await pic.installCode({ canisterId, wasm: BACKEND_WASM });
}, 120_000);

afterAll(async () => {
  await pic?.tearDown();
});

describe("connection codes", () => {
  it("creates a short shareable code and pairs two users into one conversation", async () => {
    const alice = actorFor("alice-pairs");
    const bob = actorFor("bob-pairs");

    const code = await alice.createConnectionCode();
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(0);

    const redeemed = await bob.redeemConnectionCode(code);
    expect(redeemed).toHaveProperty("ok");
    const conversationId = (redeemed as { ok: bigint }).ok;

    // Both participants see the same conversation.
    const aliceList = await alice.listConversations();
    const bobList = await bob.listConversations();
    expect(aliceList.map((c) => c.id)).toContain(conversationId);
    expect(bobList.map((c) => c.id)).toContain(conversationId);

    const aliceConv = aliceList.find((c) => c.id === conversationId);
    const bobConv = bobList.find((c) => c.id === conversationId);
    expect(aliceConv?.participants).toHaveLength(2);
    expect(bobConv?.participants).toHaveLength(2);
    expect(aliceConv?.participants.map((p) => p.toText()).sort()).toEqual(
      [principalFor("alice-pairs"), principalFor("bob-pairs")]
        .map((p) => p.toText())
        .sort(),
    );
  });

  it("rejects an unknown code with invalidCode", async () => {
    const alice = actorFor("alice-invalid");
    const result = await alice.redeemConnectionCode("NOPE-0000");
    expect(result).toEqual({ err: { invalidCode: null } });
  });

  it("rejects a code the creator tries to redeem themselves", async () => {
    const alice = actorFor("alice-self");
    const code = await alice.createConnectionCode();
    const result = await alice.redeemConnectionCode(code);
    expect(result).toEqual({ err: { cannotConnectToSelf: null } });
  });

  it("rejects a code that has already been used", async () => {
    const alice = actorFor("alice-used");
    const bob = actorFor("bob-used");
    const carol = actorFor("carol-used");

    const code = await alice.createConnectionCode();
    const first = await bob.redeemConnectionCode(code);
    expect(first).toHaveProperty("ok");

    const second = await carol.redeemConnectionCode(code);
    expect(second).toEqual({ err: { alreadyUsedCode: null } });
  });

  it("rejects an expired code", async () => {
    const alice = actorFor("alice-expired");
    const bob = actorFor("bob-expired");

    const code = await alice.createConnectionCode();
    // Codes live 24h; jump past that and let the replica observe the new time.
    await pic.advanceCertifiedTime(25 * 60 * 60 * 1000);

    const result = await bob.redeemConnectionCode(code);
    expect(result).toEqual({ err: { expiredCode: null } });
  });
});

describe("messages", () => {
  it("delivers a message from one participant to the other in order", async () => {
    const alice = actorFor("alice-msg");
    const bob = actorFor("bob-msg");
    const code = await alice.createConnectionCode();
    const redeemed = await bob.redeemConnectionCode(code);
    const conversationId = (redeemed as { ok: bigint }).ok;

    const sent = await alice.sendMessage(conversationId, "hello bob", []);
    expect(sent).toHaveProperty("ok");
    const sentMessage = (sent as { ok: { id: bigint; text: string; sender: Principal } }).ok;
    expect(sentMessage.text).toBe("hello bob");
    expect(sentMessage.sender.toText()).toBe(principalFor("alice-msg").toText());

    const page = await bob.getMessages(conversationId, [], 50n);
    expect(page).toHaveProperty("ok");
    const messages = (page as { ok: { messages: Array<{ text: string; sender: Principal }> } }).ok.messages;
    expect(messages.map((m) => m.text)).toContain("hello bob");
    expect(messages[0].sender.toText()).toBe(principalFor("alice-msg").toText());
  });

  it("rejects an empty message with emptyMessage", async () => {
    const alice = actorFor("alice-empty");
    const bob = actorFor("bob-empty");
    const code = await alice.createConnectionCode();
    const redeemed = await bob.redeemConnectionCode(code);
    const conversationId = (redeemed as { ok: bigint }).ok;

    const result = await alice.sendMessage(conversationId, "", []);
    expect(result).toEqual({ err: { emptyMessage: null } });
  });

  it("counts unread messages for the recipient and clears them on read", async () => {
    const alice = actorFor("alice-unread");
    const bob = actorFor("bob-unread");
    const code = await alice.createConnectionCode();
    const redeemed = await bob.redeemConnectionCode(code);
    const conversationId = (redeemed as { ok: bigint }).ok;

    await alice.sendMessage(conversationId, "one", []);
    await alice.sendMessage(conversationId, "two", []);

    const bobList = await bob.listConversations();
    const bobConv = bobList.find((c) => c.id === conversationId);
    expect(bobConv?.unreadCount).toBe(2n);

    // The sender's own messages are never unread for the sender.
    const aliceList = await alice.listConversations();
    expect(aliceList.find((c) => c.id === conversationId)?.unreadCount).toBe(0n);

    const marked = await bob.markConversationRead(conversationId);
    expect(marked).toEqual({ ok: null });

    const afterRead = await bob.listConversations();
    expect(afterRead.find((c) => c.id === conversationId)?.unreadCount).toBe(0n);
  });

  it("refuses a non-participant access to a conversation", async () => {
    const alice = actorFor("alice-outsider");
    const bob = actorFor("bob-outsider");
    const mallory = actorFor("mallory-outsider");
    const code = await alice.createConnectionCode();
    const redeemed = await bob.redeemConnectionCode(code);
    const conversationId = (redeemed as { ok: bigint }).ok;

    const read = await mallory.getMessages(conversationId, [], 50n);
    expect(read).toEqual({ err: { notParticipant: null } });

    const send = await mallory.sendMessage(conversationId, "intruder", []);
    expect(send).toEqual({ err: { notParticipant: null } });
  });
});

describe("leaving a conversation", () => {
  it("removes the conversation for the caller", async () => {
    const alice = actorFor("alice-leave");
    const bob = actorFor("bob-leave");
    const code = await alice.createConnectionCode();
    const redeemed = await bob.redeemConnectionCode(code);
    const conversationId = (redeemed as { ok: bigint }).ok;

    const left = await alice.leaveConversation(conversationId);
    expect(left).toEqual({ ok: null });

    const aliceList = await alice.listConversations();
    expect(aliceList.map((c) => c.id)).not.toContain(conversationId);
  });

  it("reports conversationNotFound for an unknown conversation", async () => {
    const alice = actorFor("alice-missing");
    const result = await alice.leaveConversation(999_999n);
    expect(result).toEqual({ err: { conversationNotFound: null } });
  });
});

describe("profiles", () => {
  it("saves and reads back the caller's profile", async () => {
    const alice = actorFor("alice-profile");
    await alice.saveCallerProfile({ displayName: "Alice", avatar: [] });

    const profile = await alice.getCallerProfile();
    expect(profile).toEqual([{ displayName: "Alice", avatar: [] }]);
  });

  it("exposes another user's public profile by principal", async () => {
    const alice = actorFor("alice-public");
    const bob = actorFor("bob-public");
    await alice.saveCallerProfile({ displayName: "Alice Public", avatar: [] });

    const profile = await bob.getUserProfile(principalFor("alice-public"));
    expect(profile).toEqual([{ displayName: "Alice Public", avatar: [] }]);
  });

  it("returns null for a user with no saved profile", async () => {
    const alice = actorFor("alice-noprofile");
    const profile = await alice.getCallerProfile();
    expect(profile).toEqual([]);
  });
});
