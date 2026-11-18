CREATE TABLE workspaces (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX workspaces_created ON workspaces(created);
--> statement-breakpoint
CREATE INDEX workspaces_updated ON workspaces(updated);
