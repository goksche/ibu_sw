#!/usr/bin/env python3
"""Auf Server B: frontend-slim.zip nach /opt/ibu_sw/frontend entpacken."""
import zipfile

ZIP = "/opt/ibu_sw/frontend-slim.zip"
DEST = "/opt/ibu_sw/frontend"
zipfile.ZipFile(ZIP).extractall(DEST)
print("ok")
