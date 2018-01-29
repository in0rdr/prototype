#!/bin/sh
customers=`curl -sH "Accept:application/json" http://localhost:3000/customers`;
jq_customers=`echo $customers | jq -r '.[]'`;

printf "customer address\t\t\t\tpositive\tneutral\tnegative\ttotal\n";
for c in $jq_customers; do
  reputation_summary=`curl -sH "Accept:application/json" \
                      http://localhost:3000/customers/$c/reputation`;
  positive=`echo $reputation_summary | jq -r '.rating_summary.positive'`;
  neutral=`echo $reputation_summary | jq -r '.rating_summary.neutral'`;
  negative=`echo $reputation_summary | jq -r '.rating_summary.negative'`;
  total=$((positive + neutral + negative))
  printf "%s\t%d\t\t%d\t%d\t\t%d\n" $c $positive $neutral $negative $total;
done
