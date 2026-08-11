# Output (Layer 4)

This stage's output is a **pull request** on GitHub, plus the code/test changes it contains inside
`projects/<app-name>/` — there is no local artifact to place in this folder. It exists for
structural symmetry with the other stage folders; see `stages/sense/output/README.md` for the
general reasoning on why this repo doesn't fake a local copy of output that lives elsewhere.
