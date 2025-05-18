# Getting Started with Create React App
test

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

sudo apt-get install poppler-utils
sudo apt install libreoffice

You're right - the issue was indeed resolved by a series of troubleshooting steps that led to a key discovery. The critical problem was that you had two conflicting services trying to use port 80:

1. **Firewalld was running** and interfering with network connections, which we discovered when you ran `sudo systemctl list-units --type=service | grep -i fire` and it showed `firewalld.service loaded active running`.

stop firewalld : sudo systemctl stop firewalld

2. **You had a separate Nginx process running in debug mode** with `sudo nginx -g 'daemon off;'` in another terminal. This was binding to port 80, which is why when you tried to start the normal Nginx service, you got the error:
   ```
   nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
   ```

sudo nginx -t
sudo systemctl restart nginx

The solution involved:

1. **Stopping firewalld** to prevent it from interfering with Docker's network setup and Nginx's port binding
2. **Stopping the manual Nginx debug process** that was occupying port 80
3. **Restarting the Nginx service properly** through systemd

This allowed Nginx to properly bind to port 80, which then enabled Certbot to successfully validate your domain and issue SSL certificates.

The "something strange" that fixed the issue was identifying and resolving these conflicting services. Once port 80 was properly accessible from the internet, Certbot could complete its domain validation challenge, and your HTTPS setup was successful.

This is why your site is now working correctly with HTTPS, and you're seeing the Nginx welcome page at https://www.norshin.com/.

Citations:
[1] https://pplx-res.cloudinary.com/image/private/user_uploads/24312971/6bcf7a04-cec9-42dd-8763-698a6136fd1b/Screenshot-2025-05-18-at-4.02.26-PM.jpg
[2] https://pplx-res.cloudinary.com/image/private/user_uploads/24312971/23381a59-df6f-4215-9298-5de1f2730e21/Screenshot-2025-05-18-at-4.01.38-PM.jpg
[3] https://pplx-res.cloudinary.com/image/private/user_uploads/24312971/466f45da-fb68-47d7-bc2f-cf8ce9615ea1/Screenshot-2025-05-18-at-4.05.16-PM.jpg
[4] https://pplx-res.cloudinary.com/image/private/user_uploads/24312971/aa58311b-dacd-47e5-bbcc-d4fb5f7d0bec/Screenshot-2025-05-18-at-4.05.08-PM.jpg
[5] https://stackoverflow.com/questions/47364019/how-to-change-the-port-of-nginx-when-using-with-docker
[6] https://stackoverflow.com/questions/25970711/what-is-the-difference-between-nginx-daemon-on-off-option/25972320
[7] https://github.com/nginxinc/docker-nginx/issues/126
[8] https://serverfault.com/questions/1132431/nginx-address-already-in-use-no-matter-what-port-configured
[9] https://forums.docker.com/t/unable-to-start-nginx-from-docker-file/60409
[10] https://www.uptimia.com/questions/how-to-change-the-default-port-for-nginx
[11] https://serverfault.com/questions/877904/how-to-open-up-a-port-firewall-on-ubunto-internally-and-how-to-verify-it
[12] https://www.reddit.com/r/docker/comments/1dilkit/debug_docker_network_issue_ft_nginx_proxy_manager/
[13] https://serverfault.com/questions/1104933/nginx-not-serving-from-port-80-and-443-but-works-on-other-ports
[14] https://stackoverflow.com/questions/40358923/docker-nginx-disable-default-exposed-port-80/71859687

---
Answer from Perplexity: pplx.ai/share
