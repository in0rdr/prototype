FROM ruby:rc-alpine

RUN apk add --no-cache --virtual .ruby-builddeps build-base ruby-dev nodejs tzdata
#RUN apk del .ruby-builddeps

RUN mkdir /api
WORKDIR /api
COPY startrails.sh /api
COPY ../../api /api
RUN bundle install

EXPOSE 30000

RUN chmod +x startrails.sh
CMD ["./startrails.sh"]
