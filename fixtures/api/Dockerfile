FROM ruby:rc-alpine

RUN apk add --no-cache --virtual .ruby-builddeps build-base ruby-dev nodejs tzdata
#RUN apk del .ruby-builddeps

RUN mkdir /api
WORKDIR /api
COPY Gemfile /api/Gemfile
RUN bundle install
COPY . /api

EXPOSE 30000

RUN chmod +x startrails.sh
CMD ["./startrails.sh"]
