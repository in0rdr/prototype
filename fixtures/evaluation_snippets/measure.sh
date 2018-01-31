#!/bin/sh
MEASUREMENT_INTERVAL_SEC=200
MEASUREMENT_FOLDER="./measurements"

mkdir -p $MEASUREMENT_FOLDER
chmod +x reputation.sh

while sleep $MEASUREMENT_INTERVAL_SEC; do
  ts=`date +%N`
  measurement_file="$MEASUREMENT_FOLDER/measurement_$ts.txt"
  measurement=`./reputation.sh`
  echo "$measurement" > "$MEASUREMENT_FOLDER/current.txt"
  echo "$measurement" > $measurement_file
  echo "Measurement '$ts' successful"
done

#watch -n1 cat measurements/current.txt