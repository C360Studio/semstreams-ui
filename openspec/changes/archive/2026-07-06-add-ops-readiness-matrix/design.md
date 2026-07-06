# Design

## Readiness Rows

The matrix is a presentation of the existing generic ops summary, not a new
polling surface. The summary model remains responsible for fetching backend
health, graph, flow/runtime, and trajectory data. The UI derives rows from that
model so endpoint evidence stays consistent across the admin cards and matrix.

## Flow List Evidence

The runtime summary should retain the `/flowbuilder/flows` availability result
instead of discarding it after active-flow selection. That lets the matrix
distinguish "no flow selected" from "flow list endpoint unavailable".

## Read-Only Boundary

Rows may link to browser-facing read paths when safe, but they must not expose
actions that mutate backend state or encode downstream product semantics.
