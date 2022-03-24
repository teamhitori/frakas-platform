module.exports = function (grunt) {
    grunt.initConfig({
        clean: ["wwwroot/lib/*"],

        copy: {
            main: {
                expand: true,
                cwd: 'ngApp/dist',
                src: '**',
                dest: 'wwwroot/lib/',
            },
        },

        run: {
            build: {
                exec: 'npm run build'
            }
        }
        
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask("all", ['clean', 'run', 'copy']);
    grunt.registerTask("clean-copy", ['clean', 'copy']);
};