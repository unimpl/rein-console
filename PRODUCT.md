# Rein

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React + TypeScript + Vite + @mui/material, as requested.

## Product Purpose
Manage a workspace, projects, requirements and Agent tasks through scoped group conversations and a task panel.

## Capabilities and Constraints
The default Agent roster loads from the local reinhub HTTP proxy. Agents are registered through rein CLI → Unix socket → reind → gRPC/TLS → reinhub. Agent conversations execute through native Codex/Pi subprocess pipes or an independent A2A service, with durable Hub history, multi-turn sessions, tool and text events, interaction replies, cancellation, offline/error feedback, and browser-refresh recovery. HTTP loads the latest 20 turns of a session and pages older turns on upward scroll; SSE delivers live updates from a durable cursor without Run polling. Older-history loading preserves the reading position, and live output follows the bottom only when the reader is already there. The Hub currently skips login and binds loopback only. The existing frontend demonstration remains opt-in through VITE_REIN_MODE=demo; project/task/spec/configuration/memory features remain illustrative. Preserve the compact sidebar, scoped chat, responsive panes, provider avatars, existing keyboard behavior and labeled controls.

## Brand Commitments
Name: Rein. Visual authority: Figma pzrgKXgJAyugcvBNC16Ick, nodes 2:34, 2:35, 12:1111–12:1116, 24:3887 and 24:4369. Preserve the compact white application and shared state between screens.

## Accessibility & Inclusion
Resizable desktop panes; usable narrow windows, keyboard navigation, labeled controls and reduced motion.
