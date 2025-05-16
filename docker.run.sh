docker build -t my-react-app .

docker run -p 3000:3000 -it --name my-container-name my-react-app sh

docker run -p 3000:3000 -p 3001:3001 --env-file .env.docker -it --name my-container-name my-react-app sh

docker run -p 3000:3000 -p 3001:3001 --env-file .env.docker -it --rm --name my-running-app my-react-app
