docker build -t my-react-app .

docker run -p 3000:3000 -it --name my-container-name my-react-app sh

docker run -p 3000:3000 -p 3001:3001 --env-file .env.docker -it --name my-container-name my-react-app sh



docker tag my-image new-app

docker tag my-image:latest my-image:v1.0
docker tag 0d120b6ccaae my-image:v1.0
docker tag my-image:v1.0 my-image:v2.0
docker rmi <old_image_name>[:<old_tag>]
docker push eakarsun4/pdfgenius:latest

