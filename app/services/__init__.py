"""Business logic, one module per feature.

Each service owns the logic for its requirement and is the only place routes
call into. Methods currently raise `NotImplementedError` — the API surface is
defined, the implementation is the team's job. A global handler maps that to a
501 response, so every endpoint is reachable and self-documenting today.
"""
