#!/bin/sh
printf "id\tstate\n";
for i in {0..15}; do
  end_state=`curl -sH "Accept:application/json" \
  http://localhost:3000/mitigation_tasks/$i/fetch \
  | python -c "import sys, json; print json.load(sys.stdin)[7]"`;
  printf "%d\t%d\n" $i $end_state;
done
