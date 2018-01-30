#!/bin/sh
MEASUREMENT_INTERVAL_SEC=10

while sleep $MEASUREMENT_INTERVAL_SEC; do
  sh reputation.sh
done