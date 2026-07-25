/**
 * Recommended formatters shown by the "Install Recommended Formatters" command
 * when the user has not customized `formatdir.recommendedFormatters`.
 */
export interface RecommendedFormatter {
    id: string;
    name: string;
    description: string;
}

export const DEFAULT_RECOMMENDED_FORMATTERS: RecommendedFormatter[] = [
    {
        "id": "esbenp.prettier-vscode",
        "name": "Prettier",
        "description": "JavaScript, TypeScript, CSS, JSON, HTML, YAML, PHP, Markdown"
    },
    {
        "id": "ms-python.black-formatter",
        "name": "Black Formatter",
        "description": "Python"
    },
    {
        "id": "golang.go",
        "name": "Go",
        "description": "Go"
    },
    {
        "id": "rust-lang.rust-analyzer",
        "name": "rust-analyzer",
        "description": "Rust"
    },
    {
        "id": "redhat.java",
        "name": "Red Hat Java",
        "description": "Java"
    },
    {
        "id": "ms-vscode.cpptools",
        "name": "C/C++",
        "description": "C, C++"
    },
    {
        "id": "kokororin.vscode-phpfmt",
        "name": "phpfmt",
        "description": "PHP"
    },
    {
        "id": "Vue.volar",
        "name": "Vue - Official",
        "description": "Vue"
    },
    {
        "id": "redhat.vscode-yaml",
        "name": "YAML",
        "description": "YAML"
    },
    {
        "id": "rebornix.ruby",
        "name": "Ruby",
        "description": "Ruby"
    },
    {
        "id": "DotJoshJohnson.xml",
        "name": "XML Tools",
        "description": "XML"
    },
    {
        "id": "yzhang.markdown-all-in-one",
        "name": "Markdown All in One",
        "description": "Markdown"
    },
    {
        "id": "bowlerhatllc.vscode-as3mxml",
        "name": "ActionScript & MXML",
        "description": "ActionScript, MXML"
    },
    {
        "id": "GuTheSoftware.sqlinform",
        "name": "SQLinForm",
        "description": "SQL"
    }
];
