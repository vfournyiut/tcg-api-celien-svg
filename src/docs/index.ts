import fs from "fs";
import path from "path";
import jsYaml from "js-yaml";

type OpenAPIDoc = Record<string, unknown> & { paths?: Record<string, unknown> };

const load = (file: string): OpenAPIDoc =>
    jsYaml.load(fs.readFileSync(path.join(__dirname, file), "utf8")) as OpenAPIDoc;

const base = load("swagger.config.yml");
const auth = load("auth.doc.yml");
const card = load("card.doc.yml");
const deck = load("deck.doc.yml");

export const swaggerDocument: OpenAPIDoc = {
    ...base,
    paths: {
        ...(base.paths ?? {}),
        ...(auth.paths ?? {}),
        ...(card.paths ?? {}),
        ...(deck.paths ?? {}),
    },
};
