import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const adminPassword = await bcrypt.hash('Admin@123', 10)
  const studentPassword = await bcrypt.hash('Student@123', 10)

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { phone: '6383749354' },
    update: { password: adminPassword },
    create: {
      name: 'Dr. Admin',
      phone: '6383749354',
      email: 'admin@aidslms.com',
      role: 'ADMIN',
      password: adminPassword,
    },
  })
  console.log(`✅ Admin created: ${admin.name} (${admin.phone}) / email: admin@aidslms.com`)

  // Create Demo Student
  const student = await prisma.user.upsert({
    where: { phone: '6374217463' },
    update: { password: studentPassword },
    create: {
      name: 'Demo Student',
      phone: '6374217463',
      email: 'student@aidslms.com',
      role: 'STUDENT',
      password: studentPassword,
    },
  })
  console.log(`✅ Student created: ${student.name} (${student.phone})`)

  // Create Demo Course
  const course = await prisma.course.upsert({
    where: { id: 'course-ai-ds-fundamentals' },
    update: {},
    create: {
      id: 'course-ai-ds-fundamentals',
      title: 'Artificial Intelligence & Data Science Fundamentals',
      description:
        'Master the core concepts of AI and Data Science — from Python programming to machine learning algorithms. This comprehensive course prepares you for real-world AI applications.',
      category: 'AI & Data Science',
      thumbnail: 'https://img.youtube.com/vi/LHBE6Q9XlzI/maxresdefault.jpg',
      isPublished: true,
    },
  })
  console.log(`✅ Course created: ${course.title}`)

  // Module 1
  const mod1 = await prisma.module.upsert({
    where: { id: 'module-python-basics' },
    update: {},
    create: {
      id: 'module-python-basics',
      title: 'Python Programming Foundations',
      description: 'Learn Python from scratch — variables, loops, functions, and data structures.',
      order: 1,
      courseId: course.id,
      passingScore: 60,
      questionCount: 5,
    },
  })

  // Module 2
  const mod2 = await prisma.module.upsert({
    where: { id: 'module-data-analysis' },
    update: {},
    create: {
      id: 'module-data-analysis',
      title: 'Data Analysis with NumPy & Pandas',
      description: 'Perform powerful data analysis using the most popular Python libraries.',
      order: 2,
      courseId: course.id,
      passingScore: 60,
      questionCount: 5,
    },
  })

  // Module 3
  const mod3 = await prisma.module.upsert({
    where: { id: 'module-machine-learning' },
    update: {},
    create: {
      id: 'module-machine-learning',
      title: 'Machine Learning Essentials',
      description: 'Understand supervised, unsupervised learning, and build your first ML models.',
      order: 3,
      courseId: course.id,
      passingScore: 60,
      questionCount: 5,
    },
  })
  console.log(`✅ 3 Modules created`)

  // Videos for Module 1
  const mod1Videos = [
    {
      id: 'vid-py-1',
      title: 'Python for Beginners – Full Course',
      youtubeUrl: 'https://www.youtube.com/watch?v=eWRfhZUzrAc',
      order: 1,
    },
    {
      id: 'vid-py-2',
      title: 'Python Data Types & Variables',
      youtubeUrl: 'https://www.youtube.com/watch?v=cQT33yu9pY8',
      order: 2,
    },
    {
      id: 'vid-py-3',
      title: 'Python Functions & OOP Concepts',
      youtubeUrl: 'https://www.youtube.com/watch?v=Ej_02ICOIgs',
      order: 3,
    },
  ]
  for (const v of mod1Videos) {
    await prisma.video.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, moduleId: mod1.id },
    })
  }

  // Videos for Module 2
  const mod2Videos = [
    {
      id: 'vid-np-1',
      title: 'NumPy Tutorial – Complete Beginner Guide',
      youtubeUrl: 'https://www.youtube.com/watch?v=QUT1VHiLmmI',
      order: 1,
    },
    {
      id: 'vid-pd-1',
      title: 'Pandas Tutorial – DataFrames & Analysis',
      youtubeUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg',
      order: 2,
    },
    {
      id: 'vid-viz-1',
      title: 'Matplotlib & Seaborn Visualization',
      youtubeUrl: 'https://www.youtube.com/watch?v=3Xc3CA655Y4',
      order: 3,
    },
  ]
  for (const v of mod2Videos) {
    await prisma.video.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, moduleId: mod2.id },
    })
  }

  // Videos for Module 3
  const mod3Videos = [
    {
      id: 'vid-ml-1',
      title: 'Machine Learning Full Course – Andrew NG Style',
      youtubeUrl: 'https://www.youtube.com/watch?v=jGwO_UgTS7I',
      order: 1,
    },
    {
      id: 'vid-ml-2',
      title: 'Scikit-Learn Tutorial – Build ML Models',
      youtubeUrl: 'https://www.youtube.com/watch?v=0B5eIE_1vpU',
      order: 2,
    },
    {
      id: 'vid-ml-3',
      title: 'Neural Networks & Deep Learning Explained',
      youtubeUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
      order: 3,
    },
  ]
  for (const v of mod3Videos) {
    await prisma.video.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, moduleId: mod3.id },
    })
  }
  console.log(`✅ Videos created for all modules`)

  // Questions for Module 1
  const m1Questions = [
    {
      text: 'Which of the following is a correct variable declaration in Python?',
      options: [
        { text: 'int x = 5', isCorrect: false },
        { text: 'x = 5', isCorrect: true },
        { text: 'var x = 5', isCorrect: false },
        { text: 'declare x = 5', isCorrect: false },
      ],
      explanation: 'Python uses dynamic typing. You simply assign a value with the = operator.',
    },
    {
      text: 'What will `print(type(3.14))` output?',
      options: [
        { text: '<class \'int\'>', isCorrect: false },
        { text: '<class \'str\'>', isCorrect: false },
        { text: '<class \'float\'>', isCorrect: true },
        { text: '<class \'double\'>', isCorrect: false },
      ],
      explanation: '3.14 is a floating point number, so its type is float.',
    },
    {
      text: 'Which data structure in Python is ordered and immutable?',
      options: [
        { text: 'List', isCorrect: false },
        { text: 'Dictionary', isCorrect: false },
        { text: 'Set', isCorrect: false },
        { text: 'Tuple', isCorrect: true },
      ],
      explanation: 'Tuples are ordered and immutable, unlike lists which are mutable.',
    },
    {
      text: 'What is the output of `len("Hello World")`?',
      options: [
        { text: '10', isCorrect: false },
        { text: '11', isCorrect: true },
        { text: '5', isCorrect: false },
        { text: 'Error', isCorrect: false },
      ],
      explanation: '"Hello World" has 11 characters including the space.',
    },
    {
      text: 'Which keyword is used to define a function in Python?',
      options: [
        { text: 'function', isCorrect: false },
        { text: 'func', isCorrect: false },
        { text: 'def', isCorrect: true },
        { text: 'define', isCorrect: false },
      ],
      explanation: 'The `def` keyword is used to define functions in Python.',
    },
    {
      text: 'What does the `range(1, 5)` produce?',
      options: [
        { text: '[1, 2, 3, 4, 5]', isCorrect: false },
        { text: '[1, 2, 3, 4]', isCorrect: true },
        { text: '[0, 1, 2, 3, 4]', isCorrect: false },
        { text: '[1, 5]', isCorrect: false },
      ],
      explanation: 'range(1, 5) produces values from 1 up to but NOT including 5.',
    },
    {
      text: 'How do you create a list in Python?',
      options: [
        { text: 'x = (1, 2, 3)', isCorrect: false },
        { text: 'x = {1, 2, 3}', isCorrect: false },
        { text: 'x = [1, 2, 3]', isCorrect: true },
        { text: 'x = <1, 2, 3>', isCorrect: false },
      ],
      explanation: 'Square brackets [] are used to create lists in Python.',
    },
    {
      text: 'Which method adds an element to the end of a list?',
      options: [
        { text: 'add()', isCorrect: false },
        { text: 'insert()', isCorrect: false },
        { text: 'push()', isCorrect: false },
        { text: 'append()', isCorrect: true },
      ],
      explanation: 'The append() method adds an element to the end of a list.',
    },
  ]

  for (const q of m1Questions) {
    const question = await prisma.question.create({
      data: {
        text: q.text,
        moduleId: mod1.id,
        explanation: q.explanation,
        options: {
          create: q.options.map((o, i) => ({ ...o, order: i })),
        },
      },
    })
  }
  console.log(`✅ Questions created for Module 1`)

  // Questions for Module 2
  const m2Questions = [
    {
      text: 'Which NumPy function creates an array of zeros?',
      options: [
        { text: 'np.empty()', isCorrect: false },
        { text: 'np.zeros()', isCorrect: true },
        { text: 'np.blank()', isCorrect: false },
        { text: 'np.null()', isCorrect: false },
      ],
      explanation: 'np.zeros() creates an array filled with zeros.',
    },
    {
      text: 'In Pandas, what does `df.head()` do?',
      options: [
        { text: 'Returns the last 5 rows', isCorrect: false },
        { text: 'Returns the column headers', isCorrect: false },
        { text: 'Returns the first 5 rows', isCorrect: true },
        { text: 'Returns the shape of the DataFrame', isCorrect: false },
      ],
      explanation: 'df.head() returns the first 5 rows of a DataFrame by default.',
    },
    {
      text: 'How do you select a single column from a Pandas DataFrame df?',
      options: [
        { text: 'df[0]', isCorrect: false },
        { text: 'df.column_name or df["column_name"]', isCorrect: true },
        { text: 'df.select("column_name")', isCorrect: false },
        { text: 'df.get_column("column_name")', isCorrect: false },
      ],
      explanation: 'You can access a column with df["col"] or df.col notation.',
    },
    {
      text: 'What does `df.shape` return?',
      options: [
        { text: 'Column names only', isCorrect: false },
        { text: 'Data types of each column', isCorrect: false },
        { text: 'Number of non-null values', isCorrect: false },
        { text: 'A tuple (rows, columns)', isCorrect: true },
      ],
      explanation: 'df.shape returns a tuple with (number_of_rows, number_of_columns).',
    },
    {
      text: 'Which Pandas method fills missing values?',
      options: [
        { text: 'df.replace_na()', isCorrect: false },
        { text: 'df.fillna()', isCorrect: true },
        { text: 'df.fix_null()', isCorrect: false },
        { text: 'df.fill_missing()', isCorrect: false },
      ],
      explanation: 'df.fillna() fills NaN values with a specified value.',
    },
    {
      text: 'What library is most commonly used for data visualization in Python?',
      options: [
        { text: 'Tkinter', isCorrect: false },
        { text: 'OpenCV', isCorrect: false },
        { text: 'Matplotlib', isCorrect: true },
        { text: 'PyGame', isCorrect: false },
      ],
      explanation: 'Matplotlib is the foundational plotting library in Python.',
    },
    {
      text: 'What does `np.reshape()` do?',
      options: [
        { text: 'Changes array data types', isCorrect: false },
        { text: 'Sorts the array', isCorrect: false },
        { text: 'Gives a new shape to an array without changing data', isCorrect: true },
        { text: 'Flattens a multi-dimensional array', isCorrect: false },
      ],
      explanation: 'np.reshape() changes the shape of the array without modifying the data.',
    },
    {
      text: 'Which method in Pandas groups data by a column?',
      options: [
        { text: 'df.group()', isCorrect: false },
        { text: 'df.groupby()', isCorrect: true },
        { text: 'df.cluster()', isCorrect: false },
        { text: 'df.aggregate()', isCorrect: false },
      ],
      explanation: 'df.groupby() groups rows by a column value for aggregation.',
    },
  ]

  for (const q of m2Questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        moduleId: mod2.id,
        explanation: q.explanation,
        options: {
          create: q.options.map((o, i) => ({ ...o, order: i })),
        },
      },
    })
  }
  console.log(`✅ Questions created for Module 2`)

  // Questions for Module 3
  const m3Questions = [
    {
      text: 'What type of learning uses labeled training data?',
      options: [
        { text: 'Unsupervised Learning', isCorrect: false },
        { text: 'Reinforcement Learning', isCorrect: false },
        { text: 'Supervised Learning', isCorrect: true },
        { text: 'Transfer Learning', isCorrect: false },
      ],
      explanation: 'Supervised learning uses labeled input-output pairs to train models.',
    },
    {
      text: 'Which algorithm is commonly used for classification?',
      options: [
        { text: 'Linear Regression', isCorrect: false },
        { text: 'K-Means Clustering', isCorrect: false },
        { text: 'Logistic Regression', isCorrect: true },
        { text: 'PCA', isCorrect: false },
      ],
      explanation: 'Logistic Regression is used for binary and multi-class classification.',
    },
    {
      text: 'What is overfitting in machine learning?',
      options: [
        { text: 'Model performs poorly on training data', isCorrect: false },
        { text: 'Model memorizes training data, performs poorly on new data', isCorrect: true },
        { text: 'Model has too few parameters', isCorrect: false },
        { text: 'Model uses too little training data', isCorrect: false },
      ],
      explanation: 'Overfitting occurs when a model learns the training data too well, failing to generalize.',
    },
    {
      text: 'What does "train-test split" mean?',
      options: [
        { text: 'Splitting data into features and labels', isCorrect: false },
        { text: 'Dividing data into a training set and an evaluation set', isCorrect: true },
        { text: 'Removing outliers from data', isCorrect: false },
        { text: 'Normalizing the dataset', isCorrect: false },
      ],
      explanation: 'Train-test split separates data to train the model and evaluate its performance.',
    },
    {
      text: 'What is a neural network activation function?',
      options: [
        { text: 'A cost function measuring prediction error', isCorrect: false },
        { text: 'An optimizer for gradient descent', isCorrect: false },
        { text: 'A function that introduces non-linearity in the network', isCorrect: true },
        { text: 'A regularization technique', isCorrect: false },
      ],
      explanation: 'Activation functions like ReLU, Sigmoid add non-linearity, enabling complex pattern learning.',
    },
    {
      text: 'Which scikit-learn class is used for data scaling?',
      options: [
        { text: 'StandardScaler', isCorrect: true },
        { text: 'DataNormalizer', isCorrect: false },
        { text: 'ScaleTransformer', isCorrect: false },
        { text: 'MinMaxConverter', isCorrect: false },
      ],
      explanation: 'StandardScaler standardizes features by removing mean and scaling to unit variance.',
    },
    {
      text: 'What is the purpose of cross-validation?',
      options: [
        { text: 'To speed up model training', isCorrect: false },
        { text: 'To compare two different datasets', isCorrect: false },
        { text: 'To get a reliable estimate of model performance', isCorrect: true },
        { text: 'To reduce the dataset size', isCorrect: false },
      ],
      explanation:
        'Cross-validation evaluates model performance across different subsets to reduce bias.',
    },
    {
      text: 'What does the confusion matrix measure?',
      options: [
        { text: 'How confused the model is during training', isCorrect: false },
        { text: 'The correct and incorrect predictions per class', isCorrect: true },
        { text: 'The total training time', isCorrect: false },
        { text: 'Feature importance scores', isCorrect: false },
      ],
      explanation:
        'A confusion matrix shows TP, FP, TN, FN to evaluate classifier performance.',
    },
  ]

  for (const q of m3Questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        moduleId: mod3.id,
        explanation: q.explanation,
        options: {
          create: q.options.map((o, i) => ({ ...o, order: i })),
        },
      },
    })
  }
  console.log(`✅ Questions created for Module 3`)

  // Enroll the demo student in the course
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
    },
  })
  console.log(`✅ Demo student enrolled in course`)

  console.log('\n🎉 Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📱 Admin Login:   Phone: 6383749354  OTP: 123456')
  console.log('📱 Student Login: Phone: 6374217463  OTP: 123456')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
