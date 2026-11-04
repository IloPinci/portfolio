---
title: "Research Track Guide"
tags: [bash, ros2, python]
skills: [Bash, Linux, ROS2, Python]
---

### The first steps

To create a workspace we need to create two directories. One which will be the root of the workspace. The other will be a subdirectory of it, that you will name *src*

After doing that you will need to run: ```colcon build```

Then configure the environment: `source install/setup.bash`

To call upon the operating system: `source /opt/ros/humble/setup.bash`
**(!!! Important to replace the *\<distro>* with your own Linux distribution. In my case it is humble as it allows for the usage Gazeboo and Rviz better. You will learn more about them later. !!)**
The command above is used so we can use the `ros2` command family. If this step is ignored then this error will show: ***ros2: command not found***

Now if we want to have this permanently fixed every time we open a new terminal we can do the following: 

```bash
echo "source /opt/ros/<distro>/setup.bash" >> ~/.bashrc 
source ~/.bashrc
```


To confirm that the process went smoothly we run a turtlesim command. Don't forget that you need to have the turtlesim packet installed before you run it. For our distro just follow the steps provided [here](https://docs.ros.org/en/humble/Tutorials/Beginner-CLI-Tools/Introducing-Turtlesim/Introducing-Turtlesim.html#install-turtlesim). For any other distro just Google it man!

To run the turtle simulation mode: `ros2 run turtlesim turtlesim_node`

#### Appendix:

If you are dumb like me you might have forgotten to change the *\<distro>* . Have no fear for it is something very simple to solve. Just write: `nano ~/.bashrc`

A black terminal will open. It is totally normal. Using the arrow keys go to the very end. There you will spot the line: `source /opt/ros/<distro>/setup.bash`

By using backspace you delete that line. And you can write manually:
`source /opt/ros/humble/setup.bash`  (don't forget ADD YOUR DISTRO NAME)

To save: `Ctrl+O`, then `Enter`
To exit the scary black terminal: `Ctrl+X`  (perhaps if you CTRL your X better she wouldn't have left you)


---
### Some theoretical aspects


- **Packages**: Think of it as the whole project. The folder that contains all the important files and subfolders such as the nodes, datasets, configuration files ect. It is a good idea to have a separate package for each assignment, so they do not clash with each other. 

- **Messages:** Every message that is being sent by utilizing ROS needs to have a specific data structure. You can think about this structure as a predefined rule that we need to obey. (E.g if I enter in the Italian classroom (think of it as the package) I expect to speak italian. Any other language I will not understand. Similarly if I enter in an English classroom.) The types of the messages need to be stored, and will be stored at:
	`my_package/msg/MyMessageType.msg`

- **Nodes**: They are the building blocks of the robot's hardware. Each node does its own computation for its own purpose, and then usually communicates with other nodes. However this depends on the implementation. This promotes a modular design which allows a more robust approach in case some component fails. 

- **Topics:** The messages are sent to a topic. This is called publishing a message. Each node can choose to publish from multiple topics at the same time, to no topics at all. The importance of these topics is the modularization of the information. The publisher does not need to know who the subscriber will be and vice versa, thus avoiding identification issues. This also allows the removing and adding of topics when we see fit without causing major changes in the architecture of our communication. Also every topic has its own specific message type which ensures the consistency of data. 

- **Services:** Since we mention that the communication is modular and the 'actors' don't know each other, are faced with the issue of wanting to have a precise request-reply interaction. To accommodate this *services* are introduced. They allow requests and replies by defining a pair of message structures. So a node which will provide information will offer a service under a name which then a client can use by send a request message and waiting for the reply. (Also services have service types, which serve the same purpose as the message types. Similarly they can be found: `my_package/src/MyServiceType.srv`)

(Boring I know. But to say that they are boring firstly you need to know them.)

To make the aforementioned abstractions a practicality you can use the commands below:

`ros2 node list` - all ros2 processes that are active at the moment
`ros2 topic list` - all ros2 topics that are active at the moment. So all the channels that are being used to transmit messages.
`ros2 service list` - take a wild guess.  (If you guessed channels for services you are right!)

---
### Package Creation

Now we want to create our new package. The most simple one is a package a  publisher and subscriber node respectively. 

First we go to the root of our working directory. (It is the directory that contains the following subfolders: `build  install  log  src`. Remember that we were the ones that create the *src* subfolder.  )

We navigate to the *src* directory and execute the following command: (package with python)
``` bash
# for a python package
ros2 pkg create --build-type ament_python my_py_pkg --dependencies rclpy std_msgs

# For a C++ package
ros2 pkg create --build-type ament_cmake my_c_pkg --dependencies rclcpp std_msgs
```

Lets explain the command so we don't blindly copy and paste it:

`--build-type ament_python` -> tells us that it is a Python based ros2 package

`my_my_pkg` -> this is the name of our package. Change it as you would like. 

`--dependencies rclpy std_msgs` -> package dependencies. Basically the libraries that are needed for our package to build, run and execute properly. 

There aren't default dependencies that are forced when creating the package. So unless we specify them the package won't have any. In our case we have defined `rclpy` which is the core API (API means the interface that allows computers to communicate with each other or with other computer programs) for Python of ros2. This is required for the functionality. While `std_msgs` is the basic message types. It is not required, but without it the usefulness of the package is questionable. 

In case you forget to add a dependency, or perhaps you need a functionality provided by a dependency which you didn't foresee; there is nothing you can do. You will have to wear your work boots and go and edit the `package.xml`. You will just need to add the following:
`<depend>(dependency name)</depend>` 

The don't copy and paste the line above please. Add the dependency you want between the brackets. Also remove the brackets. The line should be added after this line:
`<license>TODO: License declaration</license>`


If you are adding a new dependency you should be good to go. But if you are a person who makes a package without dependencies, (aka the kind of person who would give wings to penguins and then make them flightless birds) you have an additional step. You will have to edit `setup.py`.  You need to make sure that these lines are present:
``` python
	install_requires=[
    'setuptools',
],
```

You should find it, and if you can't you should add it right before the line: `zip_safe=True,`
Now you will have to rebuild by executing `colcon build` and `source install/setup.bash`.


--- 

### Node creation 

After our package has been created we will be faced with the following path:
`~/(workspace name)/src/(package name)`

And of course the `ls` command will output:
`first_pkg  package.xml  resource  setup.cfg  setup.py  test`

We enter the *first_pkg* which is just the name of my package, and we create two nodes. A subscriber and a publisher. We just create two files in with your favorite code editor as follows:

##### Publisher
``` python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class MinimalPublisher(Node):
    def __init__(self):
        super().__init__('minimal_publisher')
        self.publisher_ = self.create_publisher(String, 'topic', 10)
        timer_period = 0.5  # seconds
        self.timer = self.create_timer(timer_period, self.timer_callback)
        self.i = 0

    def timer_callback(self):
        msg = String()
        msg.data = 'Hello World: %d' % self.i
        self.publisher_.publish(msg)
        self.get_logger().info('Publishing: "%s"' % msg.data)
        self.i += 1

def main(args=None):
    rclpy.init(args=args)
    minimal_publisher = MinimalPublisher()
    rclpy.spin(minimal_publisher)
    minimal_publisher.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```


##### Subscriber
```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class MinimalSubscriber(Node):
    def __init__(self):
        super().__init__('minimal_subscriber')
        self.subscription = self.create_subscription(
            String,
            'topic',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg):
        self.get_logger().info('I heard: "%s"' % msg.data)

def main(args=None):
    rclpy.init(args=args)
    minimal_subscriber = MinimalSubscriber()
    rclpy.spin(minimal_subscriber)
    minimal_subscriber.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

---

### Publisher

Now lets explain what each code segment does so we don't just copy and paste:

1) **Imports:**
```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
```

`rcply` -> as you may remember this is a library which allows communication

`Node` -> it is a base class for all ros2 nodes

`String` -> it is a message type from `std_messages`. Is is specifying that the data structure being sent is a *String*


2) **Node Definition**

`class MinimalPublisher(Node):`

This defines a custom ros node. Its name 'MinimalPublisher' can be changed if we see it fit. As a ros node it inherits:
	- publishers
	- timers
	- logging
	- parameters



3) **Constructor**

The `__init__` constructor initializes the base *Node* and registers this node in the ros graph with the name that we give it. (in our case it is 'minimal_publisher')

```python
def __init__(self):
    super().__init__('minimal_publisher')
```



4) Publisher Creation

We create a publisher and that will send String messages on the topic so creatively named 'topic'. The queue size is 10, which means that we can save up to ten messages before we loose information. But if that is the case the subscribers are very slow or something wrong has happened. 
``self.publisher_ = self.create_publisher(String, 'topic', 10)``
``


5) Timer 

The purpose of the timer is to allow periodic execution without causing blocking. In our case we have decided that the `timer_callback` should be called every 0.5 seconds.
``` python
timer_period = 0.5
self.timer = self.create_timer(timer_period, self.timer_callback)

self.i = 0     #internal state

def timer_callback(self):

```



6) Initiating the message and publishing it

We need to represent the message as a ros message object, and not just a plain string. This is done by filling its data field. Then this object is published which means that all subscribers to the topic that we defined before `/topic` receive it.

```python
msg = String()
msg.data = 'Hello World: %d' % self.i

self.publisher_.publish(msg)
```



7) Logging and status update

We want to make it apparent when we have sent something. Without visual queue for us as code writers trying to debug this would be almost impossible. So to make it easier for ourselves we write a log message which appears in the terminal. And while we are at it we also increment the status to make it ready for the next iteration.
```python
self.get_logger().info('Publishing: "%s"' % msg.data) #logging

self.i += 1 #incrementing
```



8) Main and Initialization

But before we can continue with our neat functions we need to initialize all the required components in the main.

`rclpy.init(args=args)` -> initializes the ros client library and it must be called before creating any node

`minimal_publisher = MinimalPublisher()` -> we create the node. After that the constructor takes care of the publisher and the timer

`rclpy.spin(minimal_publisher)` -> this is one of the most important concepts, because it allows the ros to be defined inside an event loop. Without it the timers never fire making the node appear as 'dead'. 


9) Cleanup

After everything is finished and our execution has reached its desired goal. We want to 'delete' everything we built. This is not a very important step as it is more of a testament of the olden days, when memory and processing power was scarce. Garbage collection usually is handled but the system itself. However in the cases where we have a lot of processes and we are running in a limited device such as RasberryPi, we might encounter some issues. It is good practice to include it. (my professor would take points of our exam if we didn't. if you survived algorithms and data structures in C you would understand me)
```python
minimal_publisher.destroy_node()
rclpy.shutdown()
```



----
### Subscriber

When we talk about the subscriber we notice that it has some differences and some things in common. After all they are different sides of the same coin. 


1) Creation

To create a subscriber we follow the format below:
```python
self.subscription = self.create_subscription(
    String,
    'topic',
    self.listener_callback,
    10)
```

This registers the interest in a topic, which in our case is `\topic`. we should be careful to confirm that the topic that we are subscribing to is the topic of the publisher, on whose information we are interested on getting. Also the type of the message should match, and the size of the queue.

`listener_callback` -> has an important role, as it allows the function to execute automatically the moment when a message arrives. This is why its signature is as follows:
`def listener_callback(self, msg):`

`msg.data` -> the subscriber reads the message fields 

`self.subscription` -> keeps the reference alive 


---
### Execution


Now that we have defined our nodes we have to add them in the entry points. Therefore we need to modify the `setup.py`

```bash
entry_points={
    'console_scripts': [
        'talker = (package name).(publisher name):main',
        'listener = (package name).(subscriber name):main',
    ],
},
```

And after that we just go in the workspace root and build the package again: `colcon build --packages-select (package name)`

Don't forget: `source install/setup.bash`

And finally to execute them (in two terminals):
`ros2 run (package name) talker`
`ros2 run (package name) listener`