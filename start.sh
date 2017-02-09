#!/bin/bash

forever start -a --spinSleepTime 100 -l forever.log -o out.log -e err.log bin/www
