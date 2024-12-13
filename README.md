# Coboloop
Cobol parser to identify dead loop on code.
The program parse the tree of PERFORM calls to see if an EXEC SQL instruction is present.
If so the code exit is ERROR, otherwise SUCCESS.

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/from-referrer/)

# Usage
node analyzeCobol.js startFunction filePath
