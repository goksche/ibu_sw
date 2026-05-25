#!/bin/bash
cd /opt/ibu_sw/frontend
python3 << 'PY'
import zipfile
zipfile.ZipFile("../frontend-slim.zip").extractall(".")
PY
echo ok
