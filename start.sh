#!/bin/bash

forever start -al forever.log -o out.log -e err.log bin/www
